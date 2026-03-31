import { useEffect, useState } from 'react';
import { AudioFeatureAverages, RedFlagArtist, ScoreResult } from '@/types/spotify';
import { useConfig } from '@/hooks/useConfig';
import ReceiptifyInstructions from './ReceiptifyInstructions';
import ReceiptifyForm from './ReceiptifyForm';
import VerdictCard from './VerdictCard';
import LoadingExperience from './LoadingExperience';
import ProfileForm from './ProfileForm';

interface InitialProfile {
    genderIdentity: string;
    attractionPreference: string[];
    openToPlatonic: boolean;
}

type FlowState =
    | { phase: 'loading_me' }
    | { phase: 'idle' }
    | { phase: 'submitting'; apiPromise: Promise<Response> }
    | { phase: 'results'; result: ScoreResult; optInOpen: boolean; alreadyOptedIn: boolean }
    | { phase: 'rate_limited'; retryAfter: number }
    | { phase: 'error'; message: string };

const EMPTY_AUDIO: AudioFeatureAverages = {
    danceability: 0, energy: 0, valence: 0, tempo: 0, acousticness: 0,
    instrumentalness: 0, liveness: 0, speechiness: 0, loudness: 0,
    mode: 0, minorRatio: 0, avgTrackAgeYears: 0, avgPopularity: 0,
};

const INSUFFICIENT_RESULT: ScoreResult = {
    score: 0,
    verdict: '???',
    tagline: "Looks like your Spotify is still warming up — listen to some more music and come back!",
    confidence: 0,
    breakdown: { signal1: 0, signal2: null, signal3: null, signal4: null, signal5: 0 },
    evidenceBullets: [],
    genreDiversity: 0,
    redFlagArtists: [],
    listeningPersonality: '',
    roastLines: [],
    previousMoodQuadrant: null,
    audioFeatures: EMPTY_AUDIO,
};

function buildScoreResult(data: Record<string, unknown>): ScoreResult {
    return {
        score: (data.score ?? data.cuffedOrNotScore ?? 0) as number,
        verdict: (data.verdict ?? '???') as string,
        tagline: (data.tagline ?? '') as string,
        confidence: (data.confidence ?? 0) as number,
        breakdown: (data.breakdown ?? { signal1: 0, signal2: null, signal3: null, signal4: null, signal5: 0 }) as ScoreResult['breakdown'],
        evidenceBullets: (data.evidenceBullets ?? []) as string[],
        genreDiversity: (data.genreDiversity ?? 0) as number,
        redFlagArtists: (data.redFlagArtists ?? []) as RedFlagArtist[],
        listeningPersonality: (data.listeningPersonality ?? '') as string,
        roastLines: (data.roastLines ?? []) as string[],
        previousMoodQuadrant: (data.previousMoodQuadrant ?? null) as string | null,
        audioFeatures: (data.audioFeatures ?? EMPTY_AUDIO) as AudioFeatureAverages,
    };
}

export default function MainFlow() {
    const [state, setState] = useState<FlowState>({ phase: 'loading_me' });
    // useConfig re-fetches on window focus (no polling interval)
    const config = useConfig();
    const [alreadyOptedIn, setAlreadyOptedIn] = useState(false);
    const [firstName, setFirstName] = useState('');
    const [initialProfile, setInitialProfile] = useState<InitialProfile | undefined>(undefined);

    // Sync optInOpen into results phase state whenever the poll fires
    useEffect(() => {
        if (config === null) return;
        setState((prev) =>
            prev.phase === 'results' ? { ...prev, optInOpen: config.optInOpen } : prev
        );
    }, [config?.optInOpen]);

    useEffect(() => {
        fetch('/api/me')
            .then((r) => r.json())
            .then((data) => {
                if (data.error) {
                    setState({ phase: 'idle' });
                    return;
                }
                setAlreadyOptedIn(data.optIn ?? false);
                setFirstName(data.firstName ?? '');
                setInitialProfile(data.profile ?? undefined);
                if (data.scores?.cuffedOrNotScore != null) {
                    setState({
                        phase: 'results',
                        result: buildScoreResult(data.scores),
                        optInOpen: data.config?.optInOpen ?? true,
                        alreadyOptedIn: data.optIn ?? false,
                    });
                    // Note: subsequent polls via useConfig will keep optInOpen up-to-date
                } else {
                    setState({ phase: 'idle' });
                }
            })
            .catch(() => setState({ phase: 'idle' }));
    }, []);

    // Live countdown for rate_limited state
    useEffect(() => {
        if (state.phase !== 'rate_limited') return;
        const intervalId = setInterval(() => {
            setState((prev) => {
                if (prev.phase !== 'rate_limited') return prev;
                if (prev.retryAfter <= 1) {
                    clearInterval(intervalId);
                    return { phase: 'rate_limited', retryAfter: 0 };
                }
                return { phase: 'rate_limited', retryAfter: prev.retryAfter - 1 };
            });
        }, 1000);
        return () => clearInterval(intervalId);
    }, [state.phase]);

    const handleSubmit = (accessToken: string) => {
        const promise = fetch('/api/spotify/collect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken }),
        });
        setState({ phase: 'submitting', apiPromise: promise });
    };

    const handleLoadingComplete = (data: Record<string, unknown>) => {
        setState({
            phase: 'results',
            result: buildScoreResult(data),
            optInOpen: config?.optInOpen ?? true,
            alreadyOptedIn,
        });
    };

    const handleLoadingError = (data: { error: string; retryAfter?: number }) => {
        switch (data.error) {
            case 'SPOTIFY_TOKEN_EXPIRED':
                setState({
                    phase: 'error',
                    message: 'Your Receiptify link expired — go back to Receiptify and copy the URL again.',
                });
                break;
            case 'SPOTIFY_RATE_LIMITED':
                setState({ phase: 'rate_limited', retryAfter: data.retryAfter ?? 60 });
                break;
            case 'SPOTIFY_INSUFFICIENT_DATA':
                setState({
                    phase: 'results',
                    result: INSUFFICIENT_RESULT,
                    optInOpen: config?.optInOpen ?? true,
                    alreadyOptedIn,
                });
                break;
            case 'RATE_LIMITED': {
                const mins = Math.ceil((data.retryAfter ?? 300) / 60);
                setState({
                    phase: 'error',
                    message: `Please wait ${mins} minute${mins !== 1 ? 's' : ''} before resubmitting.`,
                });
                break;
            }
            case 'INTERNAL_ERROR':
            default:
                setState({ phase: 'error', message: 'Something went wrong. Please try again.' });
        }
    };

    const handleOptIn = () => {
        const el = document.getElementById('optin-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    };

    if (state.phase === 'loading_me') {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 rounded-full border-4 border-pmblue2-500 border-t-pmblue-500 animate-spin" />
            </div>
        );
    }

    if (state.phase === 'idle' || state.phase === 'error') {
        return (
            <div>
                {state.phase === 'error' && (
                    <div className="mb-5 rounded-xl border border-pmred-500 bg-red-50 p-4 font-work-sans text-sm text-pmred-500" role="alert">
                        {state.message}
                    </div>
                )}
                <ReceiptifyInstructions />
                <ReceiptifyForm onSubmit={handleSubmit} disabled={false} />
            </div>
        );
    }

    if (state.phase === 'submitting') {
        return (
            <LoadingExperience
                apiPromise={state.apiPromise}
                onComplete={handleLoadingComplete}
                onError={handleLoadingError}
            />
        );
    }

    if (state.phase === 'rate_limited') {
        const seconds = state.retryAfter;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        const label = mins > 0
            ? `${mins}:${String(secs).padStart(2, '0')}`
            : `${secs}s`;
        return (
            <div className="flex flex-col items-center gap-5 py-8">
                <div className="rounded-xl border-2 border-pmpink2-500 bg-white p-6 text-center max-w-sm w-full">
                    <p className="font-dela-gothic text-pmblue2-800 text-xl mb-1">Hold on a sec</p>
                    <p className="font-work-sans text-gray-600 text-sm mb-4">
                        Spotify rate-limited us. Retry in:
                    </p>
                    <p className="font-dela-gothic text-pmred-500 text-4xl tabular-nums">{label}</p>
                </div>
                <button
                    onClick={() => setState({ phase: 'idle' })}
                    disabled={seconds > 0}
                    className="min-h-[48px] w-full max-w-xs rounded-full border-4 border-pmblue-500 bg-white px-8 py-3 font-work-sans font-semibold text-pmred-500 shadow-[6px_6px_0px_0px_rgba(36,67,141,1)] transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[2px_2px_0px_0px_rgba(36,67,141,1)] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-[6px_6px_0px_0px_rgba(36,67,141,1)] disabled:translate-x-0 disabled:translate-y-0 cursor-pointer"
                >
                    Retry
                </button>
            </div>
        );
    }

    // results
    return (
        <>
            <VerdictCard
                result={state.result}
                firstName={firstName}
                optInOpen={state.optInOpen}
                alreadyOptedIn={state.alreadyOptedIn}
                onRedo={() => setState({ phase: 'idle' })}
                onOptIn={handleOptIn}
            />
            <div id="optin-section" className="mt-8">
                {state.optInOpen && (
                    <ProfileForm
                        firstName={firstName}
                        initialProfile={initialProfile}
                        optInOpen={state.optInOpen}
                        alreadyOptedIn={state.alreadyOptedIn}
                        onOptedIn={() => {
                            setAlreadyOptedIn(true);
                            setState((prev) =>
                                prev.phase === 'results'
                                    ? { ...prev, alreadyOptedIn: true }
                                    : prev
                            );
                        }}
                        onOptedOut={() => {
                            setAlreadyOptedIn(false);
                            setState((prev) =>
                                prev.phase === 'results'
                                    ? { ...prev, alreadyOptedIn: false }
                                    : prev
                            );
                        }}
                    />
                )}
            </div>
        </>
    );
}
