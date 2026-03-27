import { ScoreResult } from '@/types/spotify';

interface VerdictCardProps {
    result: ScoreResult;
    optInOpen: boolean;
    alreadyOptedIn: boolean;
    onRedo: () => void;
    onOptIn: () => void;
}

const INSUFFICIENT = '???';

export default function VerdictCard({
    result,
    optInOpen,
    alreadyOptedIn,
    onRedo,
    onOptIn,
}: VerdictCardProps) {
    const isInsufficient = result.verdict === INSUFFICIENT;

    return (
        <div className="w-full max-w-lg mx-auto">
            {/* Card */}
            <div className="rounded-2xl border-2 border-pmpink2-500 bg-white shadow-[4px_4px_0px_#FFC8E3] p-6 sm:p-8">
                {/* Score meter */}
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-1">
                        <span className="font-work-sans text-xs text-gray-500">Cuffed</span>
                        <span className="font-work-sans text-xs text-gray-500">Single</span>
                    </div>
                    {isInsufficient ? (
                        <div className="h-4 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
                            <span className="font-work-sans text-xs text-gray-400">—</span>
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
                    <div className="flex justify-center mb-5">
                        <span className="inline-flex items-center rounded-full border border-pmblue2-500 bg-blue-50 px-3 py-1 text-xs font-work-sans text-pmblue-500">
                            Algorithm confidence: {Math.round(result.confidence)}%
                        </span>
                    </div>
                )}

                {/* Evidence bullets */}
                {result.evidenceBullets.length > 0 && (
                    <ul className="space-y-2 mb-2">
                        {result.evidenceBullets.map((bullet, i) => (
                            <li key={i} className="flex items-start gap-2 font-work-sans text-sm text-gray-700">
                                <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-pmred-500" aria-hidden />
                                <span>{bullet}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Actions */}
            <div className="mt-5 flex flex-col items-center gap-3">
                {optInOpen && (
                    <button
                        onClick={onRedo}
                        className="min-h-[44px] rounded-full border-2 border-pmblue-500 px-6 py-2 font-work-sans text-sm text-pmblue-500 hover:bg-pmblue2-500 transition-colors cursor-pointer"
                    >
                        Try a different URL
                    </button>
                )}

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
                        Matching is closed — check back at 8pm on April 1!
                    </p>
                )}
            </div>
        </div>
    );
}
