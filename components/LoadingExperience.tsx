import { useEffect, useRef, useState } from 'react';
import { RedFlagArtist } from '@/types/spotify';

// ---------------------------------------------------------------------------
// Message banks
// ---------------------------------------------------------------------------

const PHASE1_MESSAGES = [
    'Scanning your guilty pleasures...',
    'Accessing your listening history...',
    'Loading your sonic fingerprint...',
];

const PHASE2_MESSAGES = [
    'Counting your sad songs...',
    'Judging your music taste...',
    'Cross-referencing your emotional damage...',
    'Checking if you\'ve moved on yet...',
    'Analyzing your 2am listening habits...',
    'Measuring your main character energy...',
    'Running the vibe check...',
    'Consulting the heartbreak database...',
    'Calculating your emotional bandwidth...',
    'Scanning for red flags in your playlists...',
    'Interviewing your top artists...',
];

const INSUFFICIENT_PHASE3 = [
    'Hmm, not much to work with here...',
    'Your Spotify is keeping its secrets...',
];

interface ApiResult {
    redFlagArtists?: RedFlagArtist[];
    roastLines?: string[];
    genreDiversity?: number;
    audioFeatures?: { minorRatio?: number; valence?: number; tempo?: number };
    [key: string]: unknown;
}

function generatePersonalizedMessages(result: ApiResult): string[] {
    const msgs: string[] = [];

    // Red flag artist tease
    if (result.redFlagArtists && result.redFlagArtists.length > 0) {
        msgs.push(`${result.redFlagArtists[0].name} in your top artists? Say less.`);
    }

    // Audio feature tease
    const af = result.audioFeatures;
    if (af) {
        if (af.minorRatio !== undefined && af.minorRatio > 0.6) {
            msgs.push(`${Math.round(af.minorRatio * 100)}% minor key... that's a lot of feelings.`);
        } else if (af.valence !== undefined && af.valence < 0.3) {
            msgs.push(`Average valence of ${af.valence.toFixed(2)}... the algorithm is concerned.`);
        } else if (af.tempo !== undefined && af.tempo < 90) {
            msgs.push(`BPM averaging ${Math.round(af.tempo)}... basically a lullaby.`);
        }
    }

    // Verdict tease
    msgs.push('Oh. OH. This is going to be good...');

    return msgs.slice(0, 3);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface LoadingExperienceProps {
    apiPromise: Promise<Response>;
    onComplete: (data: ApiResult) => void;
    onError: (data: { error: string; retryAfter?: number }) => void;
}

export default function LoadingExperience({ apiPromise, onComplete, onError }: LoadingExperienceProps) {
    const [message, setMessage] = useState(PHASE1_MESSAGES[0]);
    const [progress, setProgress] = useState(0);
    const [fadeKey, setFadeKey] = useState(0);
    const apiResultRef = useRef<ApiResult | null>(null);
    const apiErrorRef = useRef<{ error: string; retryAfter?: number } | null>(null);
    const hasCompletedRef = useRef(false);
    const onCompleteRef = useRef(onComplete);
    onCompleteRef.current = onComplete;
    const onErrorRef = useRef(onError);
    onErrorRef.current = onError;

    useEffect(() => {
        // Listen for API result
        apiPromise
            .then(async (res) => {
                const data = await res.json();
                if (data.error) {
                    apiErrorRef.current = data;
                } else {
                    apiResultRef.current = data;
                }
            })
            .catch(() => {
                apiErrorRef.current = { error: 'NETWORK_ERROR' };
            });

        let elapsed = 0;
        const TICK = 100; // ms
        let msgIndex = 0;
        let lastMsgTime = 0;
        let phase = 1;
        let personalizedMsgs: string[] = [];
        let p3MsgIndex = 0;

        const interval = setInterval(() => {
            elapsed += TICK;

            // Check for error — interrupt immediately
            if (apiErrorRef.current && !hasCompletedRef.current) {
                hasCompletedRef.current = true;
                clearInterval(interval);
                onErrorRef.current(apiErrorRef.current);
                return;
            }

            // Phase transitions
            if (phase === 1 && elapsed >= 3000) {
                phase = 2;
                msgIndex = 0;
                lastMsgTime = elapsed;
            } else if (phase === 2 && elapsed >= 6000 && apiResultRef.current) {
                phase = 3;
                personalizedMsgs = generatePersonalizedMessages(apiResultRef.current);
                p3MsgIndex = 0;
                lastMsgTime = elapsed;
            } else if (phase === 2 && elapsed >= 6000 && !apiResultRef.current) {
                // API hasn't responded yet — stay in phase 2 with extra messages
            }

            // Reveal
            if (phase === 3 && elapsed >= 8500 && apiResultRef.current && !hasCompletedRef.current) {
                hasCompletedRef.current = true;
                clearInterval(interval);
                setProgress(100);
                // Small delay for the 100% snap animation
                setTimeout(() => onCompleteRef.current(apiResultRef.current!), 400);
                return;
            }

            // Phase 2 extended — if API still not back after 15s, just wait
            if (phase === 2 && elapsed > 15000 && !apiResultRef.current) {
                setMessage('Taking longer than expected, hang tight...');
                return;
            }

            // Progress bar
            if (phase === 1) {
                setProgress(Math.min(30, (elapsed / 3000) * 30));
            } else if (phase === 2) {
                setProgress(Math.min(65, 30 + ((elapsed - 3000) / 3000) * 35));
            } else if (phase === 3) {
                setProgress(Math.min(90, 65 + ((elapsed - 6000) / 2500) * 25));
            }

            // Message rotation
            if (phase === 1 && elapsed - lastMsgTime >= 1500) {
                msgIndex = (msgIndex + 1) % PHASE1_MESSAGES.length;
                setMessage(PHASE1_MESSAGES[msgIndex]);
                setFadeKey((k) => k + 1);
                lastMsgTime = elapsed;
            } else if (phase === 2 && elapsed - lastMsgTime >= 1500) {
                msgIndex = (msgIndex + 1) % PHASE2_MESSAGES.length;
                setMessage(PHASE2_MESSAGES[msgIndex]);
                setFadeKey((k) => k + 1);
                lastMsgTime = elapsed;
            } else if (phase === 3 && elapsed - lastMsgTime >= 1200) {
                const msgs = personalizedMsgs.length > 0 ? personalizedMsgs : INSUFFICIENT_PHASE3;
                if (p3MsgIndex < msgs.length) {
                    setMessage(msgs[p3MsgIndex]);
                    setFadeKey((k) => k + 1);
                    p3MsgIndex++;
                    lastMsgTime = elapsed;
                }
            }
        }, TICK);

        return () => clearInterval(interval);
    }, [apiPromise]);

    return (
        <div className="flex flex-col items-center justify-center py-12 gap-6 w-full max-w-md mx-auto">
            {/* Progress bar */}
            <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden">
                <div
                    className={`h-full rounded-full bg-gradient-to-r from-pmblue-500 via-pmpink2-500 to-pmred-500 transition-all duration-800 ease-in-out ${
                        progress >= 85 ? 'animate-pulse' : ''
                    }`}
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Message */}
            <p
                key={fadeKey}
                className="font-work-sans text-gray-600 text-center text-lg animate-fade-in"
            >
                {message}
            </p>
        </div>
    );
}
