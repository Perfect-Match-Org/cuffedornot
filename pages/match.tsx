import { useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useConfig } from '@/hooks/useConfig';

interface MatchData {
    matchesReleased: boolean;
    matched?: boolean;
    matchedWith?: string;
    partnerFirstName?: string | null;
    platonic?: boolean;
    compatibilityScore?: number | null;
}

export default function MatchPage() {
    const { data: session, status } = useSession();
    // useConfig re-fetches on window focus (no polling interval)
    const config = useConfig();
    const [matchData, setMatchData] = useState<MatchData | null>(null);
    const [loadingMatch, setLoadingMatch] = useState(false);

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

    if (status === 'loading' || config === null) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-8 h-8 rounded-full border-4 border-pmblue2-500 border-t-pmblue-500 animate-spin" />
            </div>
        );
    }

    if (!session) {
        signIn('google');
        return null;
    }

    if (!config.matchesReleased) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] px-6">
                <div className="max-w-sm w-full text-center rounded-xl border-2 border-pmpink2-500 bg-white p-8">
                    <p className="font-dela-gothic text-pmblue2-800 text-2xl mb-3">
                        Not yet!
                    </p>
                    <p className="font-work-sans text-gray-600 text-sm leading-relaxed">
                        Matches haven&apos;t been released yet. Check back soon — this page will
                        update automatically.
                    </p>
                </div>
            </div>
        );
    }

    if (loadingMatch || matchData === null) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-8 h-8 rounded-full border-4 border-pmblue2-500 border-t-pmblue-500 animate-spin" />
            </div>
        );
    }

    if (!matchData.matched) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] px-6">
                <div className="max-w-sm w-full text-center rounded-xl border-2 border-pmpink2-500 bg-white p-8">
                    <p className="font-dela-gothic text-pmblue2-800 text-2xl mb-3">
                        No match this time
                    </p>
                    <p className="font-work-sans text-gray-600 text-sm leading-relaxed">
                        You weren&apos;t matched this round. Thanks for participating in Cornell
                        PerfectMatch!
                    </p>
                </div>
            </div>
        );
    }

    const partnerName = matchData.partnerFirstName ?? matchData.matchedWith ?? 'someone';
    const matchType = matchData.platonic ? 'friend match' : 'romantic match';

    return (
        <div className="flex items-center justify-center min-h-[60vh] px-6">
            <div className="max-w-sm w-full text-center rounded-xl border-2 border-pmblue-500 bg-white p-8 shadow-[4px_4px_0px_#24438d]">
                <p className="font-dela-gothic text-pmblue2-800 text-3xl mb-2">
                    Your Match
                </p>
                <p className="font-work-sans text-gray-500 text-sm mb-6">
                    It&apos;s a {matchType}!
                </p>
                <div className="rounded-lg bg-pmpink2-500 py-5 px-6 mb-4">
                    <p className="font-dela-gothic text-pmblue2-800 text-4xl">
                        {partnerName}
                    </p>
                </div>
                {matchData.compatibilityScore != null && (
                    <p className="font-work-sans text-gray-500 text-xs">
                        Compatibility score: {Math.round(matchData.compatibilityScore * 100)}%
                    </p>
                )}
            </div>
        </div>
    );
}
