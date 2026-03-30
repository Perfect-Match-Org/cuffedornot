import { useEffect, useState } from 'react';
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
            <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center">
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
        <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center">
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
    optInOpen,
    alreadyOptedIn,
    onRedo,
    onOptIn,
}: VerdictCardProps) {
    const [currentYear, setCurrentYear] = useState<number | null>(null);
    useEffect(() => { setCurrentYear(new Date().getFullYear()); }, []);

    const isInsufficient = result.verdict === INSUFFICIENT;

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
                            {result.roastLines.map((line, i) => (
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
                                        { axis: 'Valence', value: result.audioFeatures.valence },
                                        { axis: 'Energy', value: result.audioFeatures.energy },
                                        { axis: 'Danceability', value: result.audioFeatures.danceability },
                                        { axis: 'Acousticness', value: result.audioFeatures.acousticness },
                                        { axis: 'Instrumentalness', value: result.audioFeatures.instrumentalness },
                                        { axis: 'Speechiness', value: result.audioFeatures.speechiness },
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
                        <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center">
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
                        <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center">
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
                        <div className="rounded-2xl border border-gray-200 bg-white p-5">
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

            {/* Actions */}
            <div className="flex flex-col items-center gap-3 pt-2">
                <button
                    onClick={onRedo}
                    className="min-h-[44px] rounded-full border-2 border-pmblue-500 px-6 py-2 font-work-sans text-sm text-pmblue-500 hover:bg-pmblue2-500 transition-colors cursor-pointer"
                >
                    Try a different URL
                </button>

                {optInOpen && !alreadyOptedIn && (
                    <button
                        onClick={onOptIn}
                        className="min-h-[48px] w-full max-w-xs rounded-full border-4 border-pmblue-500 bg-white px-8 py-3 font-work-sans font-semibold text-pmblue-500 shadow-[4px_4px_0px_#24438d] transition-all hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] cursor-pointer"
                    >
                        Want to get matched?
                    </button>
                )}

                {alreadyOptedIn && (
                    <p className="font-work-sans text-sm text-gray-600 text-center">
                        You&apos;re in the matching pool! Check back April 1 at 8pm.
                    </p>
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
