import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import { isAdmin } from '@/lib/isAdmin';

interface Stats {
    totalUsers: number;
    spotifyCollected: number;
    optedIn: number;
    profileComplete: number;
}

interface Config {
    optInOpen: boolean;
    matchesReleased: boolean;
    matchingRun: boolean;
}

type ConfigField = keyof Config;

const CONFIG_LABELS: Record<ConfigField, string> = {
    optInOpen: 'Opt-In Open',
    matchesReleased: 'Matches Released',
    matchingRun: 'Matching Run',
};

export default function AdminPage() {
    const { data: session, status } = useSession();
    const [stats, setStats] = useState<Stats | null>(null);
    const [config, setConfig] = useState<Config | null>(null);
    const [loadingStats, setLoadingStats] = useState(true);
    const [togglingField, setTogglingField] = useState<ConfigField | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchStats = useCallback(async () => {
        setLoadingStats(true);
        try {
            const res = await fetch('/api/admin/stats');
            if (!res.ok) throw new Error('Failed to load stats');
            setStats(await res.json());
        } catch {
            setError('Could not load stats');
        } finally {
            setLoadingStats(false);
        }
    }, []);

    const fetchConfig = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/config');
            if (!res.ok) throw new Error('Failed to load config');
            setConfig(await res.json());
        } catch {
            setError('Could not load config');
        }
    }, []);

    useEffect(() => {
        if (status === 'authenticated' && session?.user?.email && isAdmin(session.user.email)) {
            fetchStats();
            fetchConfig();
        }
    }, [status, session, fetchStats, fetchConfig]);

    const toggleField = async (field: ConfigField) => {
        if (!config || togglingField) return;
        const newValue = !config[field];
        setTogglingField(field);
        setConfig((prev) => prev ? { ...prev, [field]: newValue } : prev);
        try {
            const res = await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ field, value: newValue }),
            });
            if (!res.ok) throw new Error();
        } catch {
            // Revert on failure
            setConfig((prev) => prev ? { ...prev, [field]: !newValue } : prev);
            setError(`Failed to update ${CONFIG_LABELS[field]}`);
        } finally {
            setTogglingField(null);
        }
    };

    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <p className="text-gray-500 font-work-sans">Loading...</p>
            </div>
        );
    }

    if (!session?.user?.email || !isAdmin(session.user.email)) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <p className="text-pmred-500 font-work-sans font-semibold">Access denied.</p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-6 py-10">
            <h1 className="font-dela-gothic text-3xl text-pmblue2-800 mb-8">Admin Dashboard</h1>

            {error && (
                <p className="mb-6 text-pmred-500 font-work-sans text-sm">{error}</p>
            )}

            {/* Stats */}
            <section className="mb-10">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-dela-gothic text-lg text-pmblue2-800">Stats</h2>
                    <button
                        onClick={fetchStats}
                        className="text-sm font-work-sans text-pmblue-500 underline hover:text-pmblue2-800 transition-colors"
                    >
                        Reload
                    </button>
                </div>
                {loadingStats ? (
                    <p className="text-gray-400 font-work-sans text-sm">Loading...</p>
                ) : stats ? (
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { label: 'Total Users', value: stats.totalUsers },
                            { label: 'Spotify Collected', value: stats.spotifyCollected },
                            { label: 'Opted In', value: stats.optedIn },
                            { label: 'Profile Complete', value: stats.profileComplete },
                        ].map(({ label, value }) => (
                            <div
                                key={label}
                                className="border-2 border-pmblue2-500 rounded-lg p-4 bg-white"
                            >
                                <p className="text-gray-500 font-work-sans text-xs mb-1">{label}</p>
                                <p className="font-dela-gothic text-2xl text-pmblue2-800">{value}</p>
                            </div>
                        ))}
                    </div>
                ) : null}
            </section>

            {/* Config toggles */}
            <section>
                <h2 className="font-dela-gothic text-lg text-pmblue2-800 mb-4">Config</h2>
                {config ? (
                    <div className="flex flex-col gap-3">
                        {(Object.keys(CONFIG_LABELS) as ConfigField[]).map((field) => (
                            <div
                                key={field}
                                className="flex items-center justify-between border-2 border-pmblue2-500 rounded-lg px-5 py-4 bg-white"
                            >
                                <span className="font-work-sans text-pmblue2-800 font-medium">
                                    {CONFIG_LABELS[field]}
                                </span>
                                <button
                                    onClick={() => toggleField(field)}
                                    disabled={togglingField === field}
                                    className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
                                        config[field] ? 'bg-pmblue-500' : 'bg-gray-300'
                                    } ${togglingField === field ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                    aria-label={`Toggle ${CONFIG_LABELS[field]}`}
                                >
                                    <span
                                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                                            config[field] ? 'translate-x-6' : 'translate-x-0'
                                        }`}
                                    />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-400 font-work-sans text-sm">Loading config...</p>
                )}
            </section>
        </div>
    );
}
