import { useEffect, useState, useRef, useCallback } from 'react';
import { ScoreResult } from '@/types/spotify';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    ResponsiveContainer,
} from 'recharts';
import { DIVERSITY_TIERS, getMusicAgeSubtitle, MOOD_QUADRANT_LABELS } from '@/lib/roast-templates';

interface VerdictCardProps {
    result: ScoreResult;
    firstName: string;
    optInOpen: boolean;
    alreadyOptedIn: boolean;
    onRedo: () => void;
    onOptIn: () => void;
}

const INSUFFICIENT = '???';

function getDiversityTier(entropy: number) {
    return DIVERSITY_TIERS.find((t) => entropy < t.maxEntropy) ?? DIVERSITY_TIERS[DIVERSITY_TIERS.length - 1];
}

function VibeShiftSection({
    audioFeatures,
    previousMoodQuadrant,
}: {
    audioFeatures: ScoreResult['audioFeatures'];
    previousMoodQuadrant: string;
}) {
    const prev = MOOD_QUADRANT_LABELS[previousMoodQuadrant] ?? previousMoodQuadrant;
    const currentQuadrant =
        audioFeatures.valence >= 0.5
            ? audioFeatures.energy >= 0.5 ? 'Social' : 'Chill'
            : audioFeatures.energy >= 0.5 ? 'Intense' : 'Brooding';
    const current = MOOD_QUADRANT_LABELS[currentQuadrant] ?? currentQuadrant;

    if (prev === current) {
        return (
            <div className="rounded-2xl border-2 border-pmblue2-500 bg-white p-5 text-center">
                <p className="font-work-sans text-xs text-gray-500 uppercase tracking-wide mb-2">
                    Vibe Check
                </p>
                <p className="font-dela-gothic text-lg text-pmblue2-800">{current}</p>
                <p className="font-work-sans text-sm text-gray-500 mt-2">
                    Your vibe held steady. Consistent.
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border-2 border-pmblue2-500 bg-white p-5 text-center">
            <p className="font-work-sans text-xs text-gray-500 uppercase tracking-wide mb-2">
                Vibe Shift Detected
            </p>
            <div className="flex items-center justify-center gap-3">
                <span className="font-dela-gothic text-lg text-pmblue2-800">{prev}</span>
                <span className="font-work-sans text-gray-400">&rarr;</span>
                <span className="font-dela-gothic text-lg text-pmred-500">{current}</span>
            </div>
            <p className="font-work-sans text-sm text-gray-500 mt-2">
                Your music mood shifted between your medium-term and recent listening.
            </p>
        </div>
    );
}

export default function VerdictCard({
    result,
    firstName,
    optInOpen,
    alreadyOptedIn,
    onRedo,
    onOptIn,
}: VerdictCardProps) {
    const [currentYear, setCurrentYear] = useState<number | null>(null);
    useEffect(() => { setCurrentYear(new Date().getFullYear()); }, []);

    const isInsufficient = result.verdict === INSUFFICIENT;

    const shareCardRef = useRef<HTMLDivElement>(null);
    const isModernIPad = typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    const isIOS = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || isModernIPad);
    const isMobile = typeof navigator !== 'undefined' && (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || isModernIPad);
    const [shareFeedback, setShareFeedback] = useState<string | null>(null);
    const [isSharing, setIsSharing] = useState(false);

    const handleShare = useCallback(async () => {
        if (isSharing) return;
        setIsSharing(true);
        try {
            // iOS Safari: text-only share (image generation unreliable on iOS)
            if (isIOS && navigator.share) {
                await navigator.share({
                    text: `${result.verdict} \u2014 ${Math.round(result.score)}/100 on Cuffed or Not!\ncuffedornot.perfectmatch.ai`,
                });
                return;
            }

            if (!shareCardRef.current) return;

            await document.fonts.ready;
            // Temporarily reveal for capture (z-index keeps it behind page content)
            const el = shareCardRef.current;
            const html2canvas = (await import('html2canvas')).default;
            let canvas;
            try {
                el.style.opacity = '1';
                canvas = await html2canvas(el, {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: '#ffffff',
                });
            } finally {
                el.style.opacity = '0';
            }

            const blob = await new Promise<Blob | null>((resolve) =>
                canvas.toBlob(resolve, 'image/png')
            );

            if (!blob) return;

            // Mobile: use Web Share API with file
            if (isMobile && navigator.share && navigator.canShare) {
                const file = new File([blob], 'cuffed-or-not.png', { type: 'image/png' });
                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({ files: [file] });
                    return;
                }
            }

            // Desktop: copy image to clipboard
            if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob }),
                ]);
                setShareFeedback('Copied to clipboard!');
                setTimeout(() => setShareFeedback(null), 2000);
                return;
            }

            // Final fallback: download as PNG
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = 'cuffed-or-not.png';
            link.href = url;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            setShareFeedback('Image downloaded!');
            setTimeout(() => setShareFeedback(null), 2000);
        } catch (err) {
            if (err instanceof Error && err.name !== 'AbortError') {
                console.warn('Share failed:', err);
            }
        } finally {
            setIsSharing(false);
        }
    }, [result, firstName, isIOS, isMobile, isSharing, isModernIPad]);

    return (
        <div className="w-full max-w-lg mx-auto space-y-6">
            {/* Section 1 — Verdict Card */}
            <div className="rounded-2xl border-2 border-pmpink2-500 bg-white shadow-[4px_4px_0px_#FFC8E3] p-6 sm:p-8">
                {/* Score meter */}
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-1">
                        <span className="font-work-sans text-xs text-gray-500">Cuffed</span>
                        <span className="font-work-sans text-xs text-gray-500">Single</span>
                    </div>
                    {isInsufficient ? (
                        <div className="h-4 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
                            <span className="font-work-sans text-xs text-gray-400">&mdash;</span>
                        </div>
                    ) : (
                        <div className="h-4 rounded-full bg-pmpink2-500 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-pmred-500 transition-all duration-700 ease-out"
                                style={{ width: `${Math.max(2, result.score)}%` }}
                                role="progressbar"
                                aria-valuenow={result.score}
                                aria-valuemin={0}
                                aria-valuemax={100}
                            />
                        </div>
                    )}
                </div>

                {/* Verdict badge */}
                <div className="text-center mb-3">
                    <h2
                        className={`font-dela-gothic text-4xl sm:text-5xl leading-tight ${
                            isInsufficient ? 'text-gray-400' : 'text-pmred-500'
                        }`}
                    >
                        {result.verdict}
                    </h2>
                </div>

                {/* Tagline */}
                <p className="text-center font-work-sans italic text-gray-600 mb-4">
                    {result.tagline}
                </p>

                {/* Confidence badge */}
                {!isInsufficient && (
                    <div className="flex justify-center mb-2">
                        <span className="inline-flex items-center rounded-full border border-pmblue2-500 bg-blue-50 px-3 py-1 text-xs font-work-sans text-pmblue-500">
                            Algorithm confidence: {Math.round(result.confidence)}%
                        </span>
                    </div>
                )}
            </div>

            {/* Sections 2-6 only shown when we have real data */}
            {isInsufficient ? (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center">
                    <p className="font-work-sans text-gray-500 text-sm">
                        We tried to roast your music taste but there wasn&apos;t enough to work with. That might be the biggest roast of all.
                    </p>
                </div>
            ) : (
                <>
                    {/* Section 2 — The Roast */}
                    {result.roastLines && result.roastLines.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="font-dela-gothic text-lg text-pmblue2-800 text-center">
                                The Algorithm&apos;s Verdict
                            </h3>
                            {Array.from(new Set(result.roastLines)).map((line, i) => (
                                <div
                                    key={i}
                                    className="rounded-xl bg-pmpink2-500/10 p-4 font-work-sans text-sm text-gray-700 opacity-0 animate-fade-in"
                                    style={{ animationDelay: `${i * 200}ms` }}
                                >
                                    {line}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Section 3 — Audio Radar Chart */}
                    {result.audioFeatures && (
                        <div className="rounded-2xl border-2 border-pmpink2-500 bg-white shadow-[4px_4px_0px_#FFC8E3] p-4 sm:p-6">
                            <h3 className="font-dela-gothic text-lg text-pmblue2-800 text-center mb-2">
                                Your Audio Profile
                            </h3>
                            <ResponsiveContainer width="100%" height={280}>
                                <RadarChart
                                    data={[
                                        { axis: 'Valence', value: Math.round(result.audioFeatures.valence * 100) },
                                        { axis: 'Energy', value: Math.round(result.audioFeatures.energy * 100) },
                                        { axis: 'Danceability', value: Math.round(result.audioFeatures.danceability * 100) },
                                        { axis: 'Acousticness', value: Math.round(result.audioFeatures.acousticness * 100) },
                                    ]}
                                >
                                    <PolarGrid stroke="#e5e7eb" />
                                    <PolarAngleAxis
                                        dataKey="axis"
                                        tick={{ fontSize: 11, fontFamily: 'Work Sans', fill: '#6b7280' }}
                                    />
                                    <Radar
                                        dataKey="value"
                                        stroke="#f30020"
                                        fill="#FFC8E3"
                                        fillOpacity={0.3}
                                        strokeWidth={2}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                            {result.listeningPersonality && (
                                <p className="text-center font-dela-gothic text-pmred-500 text-base mt-1">
                                    {result.listeningPersonality}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Section 4 — Genre Diversity */}
                    {result.genreDiversity !== undefined && result.genreDiversity > 0 && (
                        <div className="rounded-2xl border-2 border-pmblue2-500 bg-white p-5 text-center">
                            {(() => {
                                const tier = getDiversityTier(result.genreDiversity);
                                return (
                                    <>
                                        <p className="font-dela-gothic text-2xl text-pmblue2-800 mb-1">
                                            {tier.label}
                                        </p>
                                        <p className="font-work-sans text-sm text-gray-600 mb-2">
                                            {tier.description}
                                        </p>
                                        <p className="font-work-sans text-xs text-gray-400">
                                            Diversity index: {result.genreDiversity.toFixed(1)}
                                        </p>
                                    </>
                                );
                            })()}
                        </div>
                    )}

                    {/* Section 5 — Music Age */}
                    {result.audioFeatures && result.audioFeatures.avgTrackAgeYears > 0 && (
                        <div className="rounded-2xl border-2 border-pmblue2-500 bg-white p-5 text-center">
                            {(() => {
                                const musicAgeYear = (currentYear ?? new Date().getFullYear()) - Math.round(result.audioFeatures.avgTrackAgeYears);
                                return (
                                    <>
                                        <p className="font-work-sans text-xs text-gray-500 uppercase tracking-wide mb-1">
                                            Your Music Age
                                        </p>
                                        <p className="font-dela-gothic text-4xl text-pmblue2-800">
                                            {musicAgeYear}
                                        </p>
                                        <p className="font-work-sans text-sm text-gray-600 mt-1">
                                            {getMusicAgeSubtitle(musicAgeYear)}
                                        </p>
                                    </>
                                );
                            })()}
                        </div>
                    )}

                    {/* Section 6 — Vibe Shift */}
                    {result.previousMoodQuadrant && result.audioFeatures && (
                        <VibeShiftSection
                            audioFeatures={result.audioFeatures}
                            previousMoodQuadrant={result.previousMoodQuadrant}
                        />
                    )}

                    {/* Section 7 — Evidence Bullets */}
                    {result.evidenceBullets.length > 0 && (
                        <div className="rounded-2xl border-2 border-pmblue2-500 bg-white p-5">
                            <h3 className="font-dela-gothic text-sm text-gray-500 uppercase tracking-wide mb-3">
                                The Data
                            </h3>
                            <ul className="space-y-2">
                                {result.evidenceBullets.map((bullet, i) => (
                                    <li key={i} className="flex items-start gap-2 font-work-sans text-sm text-gray-700">
                                        <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-pmred-500" aria-hidden />
                                        <span>{bullet}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </>
            )}

            {/* Hidden share card for image generation */}
            {!isInsufficient && (
                <div
                    ref={shareCardRef}
                    aria-hidden
                    style={{ position: 'fixed', left: 0, top: 0, opacity: 0, pointerEvents: 'none', zIndex: -9999 }}
                    className="w-[420px] bg-white rounded-2xl border-2 border-pmpink2-500 p-7 space-y-3"
                >
                    {/* Header */}
                    <p className="font-work-sans text-xs text-gray-400 text-center uppercase tracking-widest">
                        {firstName ? `${firstName}\u2019s Spotify says...` : 'Your Spotify says...'}
                    </p>

                    {/* Verdict */}
                    <p className="font-dela-gothic text-4xl text-pmred-500 text-center leading-tight">
                        {result.verdict}
                    </p>

                    {/* Tagline */}
                    <p className="font-work-sans text-sm text-gray-500 text-center italic">
                        {result.tagline}
                    </p>

                    {/* Score bar */}
                    <div>
                        <div className="flex justify-between font-work-sans text-xs text-gray-400 mb-1">
                            <span>Cuffed</span>
                            <span>Single</span>
                        </div>
                        <div className="h-5 rounded-full bg-pmpink2-500 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-pmred-500"
                                style={{ width: `${Math.max(2, result.score)}%` }}
                            />
                        </div>
                        <p className="font-dela-gothic text-lg text-pmred-500 text-right mt-1">
                            {Math.round(result.score)}/100
                        </p>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-pmpink2-500" />

                    {/* Roast */}
                    {result.roastLines?.[0] && (
                        <div className="bg-pmpink2-500/20 rounded-xl px-4 py-3">
                            <p className="font-work-sans text-sm text-gray-700 text-center italic leading-relaxed">
                                &ldquo;{result.roastLines[0]}&rdquo;
                            </p>
                        </div>
                    )}

                    {/* Red flag artist callout */}
                    {result.redFlagArtists?.[0] && (
                        <p className="font-work-sans text-xs text-gray-500 text-center">
                            Caught listening to <span className="font-semibold text-pmred-500">{result.redFlagArtists[0].name}</span>
                        </p>
                    )}

                    {/* Audio stats row */}
                    {result.audioFeatures && (
                        <div className="flex justify-between gap-2">
                            {[
                                { label: 'Vibe', value: `${Math.round(result.audioFeatures.valence * 100)}%` },
                                { label: 'Energy', value: `${Math.round(result.audioFeatures.energy * 100)}%` },
                                { label: 'Dance', value: `${Math.round(result.audioFeatures.danceability * 100)}%` },
                            ].map((stat) => (
                                <div key={stat.label} className="flex-1 bg-gray-50 rounded-lg py-2 text-center">
                                    <p className="font-dela-gothic text-base text-pmblue2-800">{stat.value}</p>
                                    <p className="font-work-sans text-xs text-gray-400">{stat.label}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Listening personality */}
                    {result.listeningPersonality && (
                        <p className="font-dela-gothic text-sm text-pmblue-500 text-center">
                            {result.listeningPersonality}
                        </p>
                    )}

                    {/* Footer */}
                    <p className="font-work-sans text-xs text-gray-300 text-center pt-1">
                        cuffedornot.perfectmatch.ai
                    </p>
                </div>
            )}

            {/* Actions */}
            <div className="flex flex-col items-center gap-3 pt-2">
                <button
                    onClick={onRedo}
                    className="min-h-[44px] rounded-full border-2 border-pmblue-500 px-6 py-2 font-work-sans text-sm text-pmblue-500 shadow-[3px_3px_0px_0px_rgba(36,67,141,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_rgba(36,67,141,1)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none cursor-pointer"
                >
                    Try a different URL
                </button>

                {!isInsufficient && (
                    <button
                        onClick={handleShare}
                        disabled={isSharing}
                        className="min-h-[44px] rounded-full border-2 border-pmred-500 px-6 py-2 font-work-sans text-sm text-pmred-500 shadow-[3px_3px_0px_0px_rgba(36,67,141,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_rgba(36,67,141,1)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-[3px_3px_0px_0px_rgba(36,67,141,1)]"
                    >
                        {shareFeedback ?? (isSharing ? 'Sharing...' : 'Share your result')}
                    </button>
                )}

                {optInOpen && !alreadyOptedIn && (
                    <button
                        onClick={onOptIn}
                        className="min-h-[48px] w-full max-w-xs rounded-full border-4 border-pmblue-500 bg-white px-8 py-3 font-work-sans font-semibold text-pmred-500 shadow-[6px_6px_0px_0px_rgba(36,67,141,1)] transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[2px_2px_0px_0px_rgba(36,67,141,1)] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none cursor-pointer"
                    >
                        Want to get matched?
                    </button>
                )}


                {!optInOpen && (
                    <p className="font-work-sans text-sm text-gray-500 text-center">
                        Matching is closed &mdash; check back at 8pm on April 1!
                    </p>
                )}
            </div>
        </div>
    );
}
