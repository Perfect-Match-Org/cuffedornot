import { useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import Link from 'next/link';
import { useConfig } from '@/hooks/useConfig';
import { MOOD_QUADRANT_LABELS } from '@/lib/roast-templates';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SharedAnthem {
    name: string;
    artist: string;
}

interface OverlappingArtist {
    id: string;
    name: string;
}

interface MatchPayload {
    firstName: string;
    verdict: string;
    score: number;
    platonic: boolean;
    compatibilityScore: number;
    sharedAnthem: SharedAnthem | null;
    overlappingArtists: OverlappingArtist[];
    overlappingGenres: string[];
    moodQuadrant: string;
    esType: 'Empathizer' | 'Systemizer';
    relationshipForecast: string[];
}

interface MatchData {
    matchesReleased: boolean;
    optIn?: boolean;
    unmatchable?: boolean;
    myScore?: { score: number; verdict: string; confidence: number } | null;
    match?: MatchPayload | null;
}

// ── Countdown ─────────────────────────────────────────────────────────────────

const REVEAL_TIME = new Date('2026-04-01T20:00:00-04:00').getTime();

function useCountdown() {
    const [remaining, setRemaining] = useState(0);
    useEffect(() => {
        setRemaining(Math.max(0, REVEAL_TIME - Date.now()));
        const id = setInterval(() => {
            setRemaining(Math.max(0, REVEAL_TIME - Date.now()));
        }, 1000);
        return () => clearInterval(id);
    }, []);
    return remaining;
}

function formatCountdown(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    return [hours, minutes, seconds].map((v) => String(v).padStart(2, '0')).join(':');
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Spinner() {
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-8 h-8 rounded-full border-4 border-pmblue2-500 border-t-pmblue-500 animate-spin" />
        </div>
    );
}

function ScoreMeter({ score }: { score: number }) {
    return (
        <div className="h-3 rounded-full bg-pmpink2-500 overflow-hidden">
            <div
                className="h-full rounded-full bg-pmred-500 transition-all duration-700 ease-out"
                style={{ width: `${Math.max(2, score)}%` }}
                role="progressbar"
                aria-valuenow={score}
                aria-valuemin={0}
                aria-valuemax={100}
            />
        </div>
    );
}

function CountdownScreen({ remaining }: { remaining: number }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 gap-6">
            {/* Blurred locked card */}
            <div className="relative w-full max-w-sm rounded-2xl border-2 border-pmpink2-500 bg-white shadow-[4px_4px_0px_#FFC8E3] overflow-hidden">
                <div className="blur-sm p-8 select-none pointer-events-none space-y-3" aria-hidden>
                    <div className="h-7 bg-pmpink2-500 rounded-full w-2/3 mx-auto" />
                    <div className="h-3 bg-gray-200 rounded-full w-full" />
                    <div className="h-3 bg-gray-200 rounded-full w-4/5" />
                    <div className="h-3 bg-gray-200 rounded-full w-full" />
                    <div className="h-3 bg-gray-200 rounded-full w-3/5 mx-auto" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                    <p className="font-dela-gothic text-pmblue2-800 text-lg text-center px-6">
                        Your match is sealed.
                    </p>
                </div>
            </div>

            <div className="text-center">
                <p className="font-work-sans text-gray-500 text-sm mb-2">
                    Come back April 1 at 8pm
                </p>
                <p className="font-dela-gothic text-pmred-500 text-5xl tabular-nums">
                    {remaining > 0 ? formatCountdown(remaining) : '00:00:00'}
                </p>
            </div>
        </div>
    );
}

function NotOptedInScreen() {
    return (
        <div className="flex items-center justify-center min-h-[60vh] px-6">
            <div className="max-w-sm w-full text-center rounded-2xl border-2 border-pmpink2-500 bg-white shadow-[4px_4px_0px_#FFC8E3] p-8">
                <p className="font-dela-gothic text-pmblue2-800 text-2xl mb-3">Not in the pool</p>
                <p className="font-work-sans text-gray-600 text-sm leading-relaxed">
                    You weren&apos;t in the matching pool this round. You can still check your Cuffed or Not score on the{' '}
                    <Link href="/" className="text-pmblue-500 underline">home page</Link>.
                </p>
            </div>
        </div>
    );
}

function NoMatchScreen() {
    return (
        <div className="flex items-center justify-center min-h-[60vh] px-6">
            <div className="max-w-sm w-full text-center rounded-2xl border-2 border-pmpink2-500 bg-white shadow-[4px_4px_0px_#FFC8E3] p-8">
                <p className="font-dela-gothic text-pmblue2-800 text-2xl mb-3">No match this time</p>
                <p className="font-work-sans text-gray-600 text-sm leading-relaxed">
                    The algorithm couldn&apos;t find your match this round. Thanks for participating in Cornell PerfectMatch!
                </p>
            </div>
        </div>
    );
}

function MatchCard({ match }: { match: MatchPayload }) {
    const [flipped, setFlipped] = useState(false);
    const compatPct = Math.round(match.compatibilityScore * 100);
    const isGhost = match.firstName === 'McGraw Tower';
    const moodLabel = MOOD_QUADRANT_LABELS[match.moodQuadrant] ?? match.moodQuadrant;

    return (
        <div className="w-full max-w-sm mx-auto px-4 py-8">
            <div className="perspective-400">
                <div
                    className={`transform-3d relative transition-[transform] duration-700 min-h-[580px] cursor-pointer ${
                        flipped ? 'rotate-y-half' : 'rotate-y-0'
                    }`}
                    onClick={() => !flipped && setFlipped(true)}
                    role="button"
                    aria-label={flipped ? 'Match revealed' : 'Tap to reveal your match'}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && !flipped && setFlipped(true)}
                >
                    {/* ── Front face ── */}
                    <div className="backface-hidden absolute inset-0 rounded-2xl border-2 border-pmpink2-500 bg-white shadow-[4px_4px_0px_#FFC8E3] overflow-hidden flex flex-col">
                        {/* Blurred placeholder content */}
                        <div className="blur-sm flex-1 p-8 select-none pointer-events-none space-y-4" aria-hidden>
                            <div className="h-8 bg-pmpink2-500 rounded-full w-2/3 mx-auto" />
                            <div className="h-3 bg-gray-200 rounded-full w-full" />
                            <div className="h-3 bg-gray-200 rounded-full w-4/5" />
                            <div className="h-20 bg-pmpink2-500 rounded-xl w-full opacity-50" />
                            <div className="h-3 bg-gray-200 rounded-full w-full" />
                            <div className="h-3 bg-gray-200 rounded-full w-3/5" />
                        </div>
                        {/* Overlay */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/75 gap-4">
                            <p className="font-dela-gothic text-pmblue2-800 text-2xl text-center px-6">
                                Tap to reveal your match
                            </p>
                            <div className="w-8 h-8 rounded-full border-4 border-pmpink2-500 border-t-pmblue-500 animate-spin" />
                        </div>
                    </div>

                    {/* ── Back face ── */}
                    <div className="backface-hidden rotate-y-half absolute inset-0 rounded-2xl border-2 border-pmpink2-500 bg-white shadow-[4px_4px_0px_#FFC8E3] overflow-y-auto">
                        <div className="p-6 space-y-5">
                            {/* Platonic badge */}
                            {match.platonic && (
                                <div className="inline-block rounded-full bg-pmblue2-500 px-3 py-1 font-work-sans text-xs font-semibold text-pmblue-500">
                                    Matched as music buddies
                                </div>
                            )}

                            {/* Name + verdict */}
                            <div>
                                <p className="font-dela-gothic text-pmblue2-800 text-4xl leading-tight">
                                    {match.firstName}
                                </p>
                                <p className="font-work-sans text-gray-500 text-sm mt-1">{match.verdict}</p>
                            </div>

                            {/* Their score meter */}
                            <div>
                                <div className="flex justify-between font-work-sans text-xs text-gray-400 mb-1">
                                    <span>Cuffed</span>
                                    <span>Single</span>
                                </div>
                                <ScoreMeter score={match.score} />
                                <p className="font-work-sans text-xs text-gray-400 mt-1 text-right">
                                    {match.score}/100
                                </p>
                            </div>

                            {/* Compatibility */}
                            <div className="rounded-xl bg-pmred-500 px-4 py-3 text-center">
                                <p className="font-dela-gothic text-white text-3xl">
                                    {compatPct}% Compatible
                                </p>
                            </div>

                            {/* Shared Anthem */}
                            <div className="rounded-xl bg-pmpink2-500 px-4 py-3">
                                <p className="font-work-sans text-xs font-semibold text-pmblue-500 uppercase tracking-wide mb-1">
                                    Your shared anthem
                                </p>
                                {isGhost && !match.sharedAnthem ? (
                                    <p className="font-dela-gothic text-pmblue2-800 text-base leading-snug">
                                        Every 15 minutes, on the 15 minutes. You know the one.
                                    </p>
                                ) : match.sharedAnthem ? (
                                    <>
                                        <p className="font-dela-gothic text-pmblue2-800 text-lg leading-tight">
                                            {match.sharedAnthem.name}
                                        </p>
                                        <p className="font-work-sans text-sm text-pmblue2-800 opacity-75">
                                            {match.sharedAnthem.artist}
                                        </p>
                                    </>
                                ) : (
                                    <p className="font-work-sans text-sm text-pmblue2-800">
                                        No shared tracks — your date playlist starts from scratch.
                                    </p>
                                )}
                            </div>

                            {/* Overlapping artists */}
                            <div>
                                <p className="font-work-sans text-xs font-semibold text-pmblue2-800 uppercase tracking-wide mb-2">
                                    Artists you both love
                                </p>
                                {match.overlappingArtists.length > 0 ? (
                                    <ul className="space-y-1">
                                        {match.overlappingArtists.map((a) => (
                                            <li key={a.id} className="font-work-sans text-sm text-gray-700">
                                                {a.name}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="font-work-sans text-sm text-gray-500">
                                        You two have completely unique tastes — that&apos;s the fun part.
                                    </p>
                                )}
                            </div>

                            {/* Overlapping genres */}
                            <div>
                                <p className="font-work-sans text-xs font-semibold text-pmblue2-800 uppercase tracking-wide mb-2">
                                    Genres in common
                                </p>
                                {match.overlappingGenres.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {match.overlappingGenres.map((g) => (
                                            <span
                                                key={g}
                                                className="rounded-full bg-pmblue2-500 px-3 py-1 font-work-sans text-xs text-pmblue2-800"
                                            >
                                                {g}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="font-work-sans text-sm text-gray-500">
                                        No genre overlap — opposites attract?
                                    </p>
                                )}
                            </div>

                            {/* Mood + E/S comparison */}
                            <div className="rounded-xl border border-pmblue2-500 p-4 space-y-2">
                                <p className="font-work-sans text-xs font-semibold text-pmblue2-800 uppercase tracking-wide">
                                    Their vibe
                                </p>
                                <div className="flex gap-3">
                                    <span className="rounded-full bg-pmpink2-500 px-3 py-1 font-work-sans text-xs text-pmblue2-800">
                                        {moodLabel}
                                    </span>
                                    <span className="rounded-full bg-pmpink2-500 px-3 py-1 font-work-sans text-xs text-pmblue2-800">
                                        {match.esType}
                                    </span>
                                </div>
                            </div>

                            {/* Relationship forecast */}
                            <div className="rounded-xl border-2 border-pmblue-500 p-4">
                                <p className="font-work-sans text-xs font-semibold text-pmblue-500 uppercase tracking-wide mb-2">
                                    Relationship forecast
                                </p>
                                {match.relationshipForecast.map((line, i) => (
                                    <p key={i} className="font-work-sans text-sm text-pmblue2-800 leading-relaxed">
                                        {line}
                                    </p>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MatchPage() {
    const { data: session, status } = useSession();
    const config = useConfig();
    const [matchData, setMatchData] = useState<MatchData | null>(null);
    const [loadingMatch, setLoadingMatch] = useState(false);
    const remaining = useCountdown();

    useEffect(() => {
        if (!config?.matchesReleased) return;
        if (!session) return;
        setLoadingMatch(true);
        fetch('/api/match')
            .then((r) => r.json())
            .then((data: MatchData) => setMatchData(data))
            .catch(() => setMatchData(null))
            .finally(() => setLoadingMatch(false));
    }, [config?.matchesReleased, session]);

    if (status === 'loading' || config === null) return <Spinner />;

    if (!session) {
        signIn('google');
        return null;
    }

    if (!config.matchesReleased) {
        return <CountdownScreen remaining={remaining} />;
    }

    if (loadingMatch || matchData === null) return <Spinner />;

    if (!matchData.optIn) return <NotOptedInScreen />;

    if (!matchData.match) return <NoMatchScreen />;

    return <MatchCard match={matchData.match} />;
}
