import { useState, useEffect, useCallback } from 'react';

interface MatchPair {
    userA: { email: string; firstName: string | null };
    userB: { email: string; firstName: string | null };
    platonic: boolean;
    compatibilityScore: number | null;
    ghost: boolean;
}

interface UnmatchableUser {
    email: string;
    firstName: string | null;
}

interface MatchPreviewProps {
    onForceMatchPrefill: (email: string) => void;
    refreshTrigger: number;
}

export default function MatchPreview({ onForceMatchPrefill, refreshTrigger }: MatchPreviewProps) {
    const [pairs, setPairs] = useState<MatchPair[]>([]);
    const [unmatchable, setUnmatchable] = useState<UnmatchableUser[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchMatches = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/matches');
            if (!res.ok) return;
            const data = await res.json();
            setPairs(data.pairs);
            setUnmatchable(data.unmatchable);
        } catch {
            // Silent
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMatches();
    }, [fetchMatches, refreshTrigger]);

    return (
        <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
                <h2 className="font-dela-gothic text-lg text-pmblue2-800">Match Preview</h2>
                <button
                    onClick={fetchMatches}
                    className="text-sm font-work-sans text-pmblue-500 underline hover:text-pmblue2-800 transition-colors"
                >
                    Reload
                </button>
            </div>

            <div className="border-2 border-pmblue2-500 rounded-lg overflow-x-auto mb-6">
                <table className="w-full text-sm font-work-sans">
                    <thead>
                        <tr className="bg-pmblue2-500/20">
                            <th className="px-3 py-2 text-left text-pmblue2-800 font-semibold">User A</th>
                            <th className="px-3 py-2 text-left text-pmblue2-800 font-semibold">User B</th>
                            <th className="px-3 py-2 text-left text-pmblue2-800 font-semibold">Score</th>
                            <th className="px-3 py-2 text-left text-pmblue2-800 font-semibold">Platonic</th>
                            <th className="px-3 py-2 text-left text-pmblue2-800 font-semibold">Flags</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-3 py-6 text-center text-gray-400">Loading...</td>
                            </tr>
                        ) : pairs.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-3 py-6 text-center text-gray-400">No matched pairs</td>
                            </tr>
                        ) : (
                            pairs.map((p, i) => (
                                <tr key={i} className="even:bg-gray-50 border-t border-gray-100">
                                    <td className="px-3 py-2 truncate max-w-[200px]" title={p.userA.email}>
                                        {p.userA.firstName ?? p.userA.email}
                                    </td>
                                    <td className="px-3 py-2 truncate max-w-[200px]" title={p.userB.email}>
                                        {p.userB.firstName ?? p.userB.email}
                                    </td>
                                    <td className="px-3 py-2">
                                        {p.compatibilityScore != null ? p.compatibilityScore.toFixed(2) : '—'}
                                    </td>
                                    <td className="px-3 py-2">
                                        <span className={p.platonic ? 'text-green-600' : 'text-gray-400'}>
                                            {p.platonic ? 'Yes' : 'No'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2">
                                        {p.ghost && (
                                            <span className="text-pmred-500 font-semibold">[GHOST]</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Unmatchable Users */}
            <div className="border-2 border-pmblue2-500 rounded-lg p-4">
                <h3 className="font-dela-gothic text-base text-pmblue2-800 mb-3">Unmatchable Users</h3>
                {unmatchable.length === 0 ? (
                    <p className="font-work-sans text-sm text-gray-400">None</p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {unmatchable.map((u) => (
                            <div key={u.email} className="flex items-center justify-between py-1">
                                <span className="font-work-sans text-sm text-gray-700">
                                    {u.firstName ? `${u.firstName} (${u.email})` : u.email}
                                </span>
                                <button
                                    onClick={() => onForceMatchPrefill(u.email)}
                                    className="text-xs font-work-sans text-pmblue-500 underline hover:text-pmblue2-800 transition-colors"
                                >
                                    Override
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
