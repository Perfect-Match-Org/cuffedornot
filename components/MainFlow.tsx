import { useEffect, useState } from 'react';
import { ScoreResult } from '@/types/spotify';
import ReceiptifyInstructions from './ReceiptifyInstructions';
import ReceiptifyForm from './ReceiptifyForm';
import VerdictCard from './VerdictCard';

type FlowState =
    | { phase: 'loading_me' }
    | { phase: 'idle' }
    | { phase: 'submitting' }
    | { phase: 'results'; result: ScoreResult; optInOpen: boolean; alreadyOptedIn: boolean }
    | { phase: 'rate_limited'; retryAfter: number }
    | { phase: 'error'; message: string };

const INSUFFICIENT_RESULT: ScoreResult = {
    score: 0,
    verdict: '???',
    tagline: "Looks like your Spotify is still warming up — listen to some more music and come back!",
    confidence: 0,
    breakdown: { signal1: 0, signal2: null, signal3: null, signal4: null, signal5: 0 },
    evidenceBullets: [],
};

export default function MainFlow() {
    const [state, setState] = useState<FlowState>({ phase: 'loading_me' });
    const [optInOpen, setOptInOpen] = useState(true);
    const [alreadyOptedIn, setAlreadyOptedIn] = useState(false);

    useEffect(() => {
        fetch('/api/me')
            .then((r) => r.json())
            .then((data) => {
                setOptInOpen(data.config?.optInOpen ?? true);
                setAlreadyOptedIn(data.optIn ?? false);
                if (data.scores?.cuffedOrNotScore != null) {
                    setState({
                        phase: 'results',
                        result: {
                            score: data.scores.cuffedOrNotScore,
                            verdict: data.scores.verdict ?? '???',
                            tagline: data.scores.tagline ?? '',
                            confidence: data.scores.confidence ?? 0,
                            breakdown: data.scores.breakdown ?? {
                                signal1: 0, signal2: null, signal3: null, signal4: null, signal5: 0,
                            },
                            evidenceBullets: data.scores.evidenceBullets ?? [],
                        },
                        optInOpen: data.config?.optInOpen ?? true,
                        alreadyOptedIn: data.optIn ?? false,
                    });
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

    const handleSubmit = async (accessToken: string) => {
        setState({ phase: 'submitting' });
        try {
            const res = await fetch('/api/spotify/collect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken }),
            });
            const data = await res.json();

            if (data.error) {
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
                            optInOpen,
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
                    default:
                        setState({ phase: 'error', message: 'Something went wrong. Please try again.' });
                }
                return;
            }

            setState({
                phase: 'results',
                result: {
                    score: data.score,
                    verdict: data.verdict,
                    tagline: data.tagline,
                    confidence: data.confidence,
                    breakdown: data.breakdown,
                    evidenceBullets: data.evidenceBullets ?? [],
                },
                optInOpen,
                alreadyOptedIn,
            });
        } catch {
            setState({ phase: 'error', message: 'Network error — please check your connection and try again.' });
        }
    };

    const handleOptIn = () => {
        // Sprint 5 will implement full opt-in form; placeholder scroll/stub
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
            <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="w-10 h-10 rounded-full border-4 border-pmblue2-500 border-t-pmblue-500 animate-spin" />
                <p className="font-work-sans text-gray-600 text-lg">Analyzing your Spotify…</p>
            </div>
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
                    className="min-h-[48px] w-full max-w-xs rounded-full border-4 border-pmblue-500 bg-white px-8 py-3 font-work-sans font-semibold text-pmblue-500 shadow-[4px_4px_0px_#24438d] transition-all hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-[4px_4px_0px_#24438d] disabled:translate-x-0 disabled:translate-y-0 cursor-pointer"
                >
                    Retry
                </button>
            </div>
        );
    }

    // results
    return (
        <VerdictCard
            result={state.result}
            optInOpen={state.optInOpen}
            alreadyOptedIn={state.alreadyOptedIn}
            onRedo={() => setState({ phase: 'idle' })}
            onOptIn={handleOptIn}
        />
    );
}
