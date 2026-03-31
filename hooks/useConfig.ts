import { useState, useEffect, useCallback, useRef } from 'react';

interface AppConfig {
    optInOpen: boolean;
    matchesReleased: boolean;
    matchingRun: boolean;
}

const REFETCH_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes — admin flags change 2–3 times per event

/**
 * Fetches /api/me on mount and re-fetches whenever the window regains focus,
 * but at most once every 3 minutes (client-side time gate on the ref).
 * Focus revalidation is kept over polling — zero background requests when idle.
 */
export function useConfig() {
    const [config, setConfig] = useState<AppConfig | null>(null);
    const lastFetchedAt = useRef<number>(0);

    const fetchConfig = useCallback(async () => {
        if (Date.now() - lastFetchedAt.current < REFETCH_INTERVAL_MS) return;
        lastFetchedAt.current = Date.now();
        try {
            const res = await fetch('/api/me');
            if (!res.ok) return;
            const data = await res.json();
            if (data.config) {
                setConfig({
                    optInOpen: data.config.optInOpen ?? false,
                    matchesReleased: data.config.matchesReleased ?? false,
                    matchingRun: data.config.matchingRun ?? false,
                });
            }
        } catch {
            // Silent — keep last-known values
        }
    }, []);

    useEffect(() => {
        fetchConfig();
        window.addEventListener('focus', fetchConfig);
        return () => window.removeEventListener('focus', fetchConfig);
    }, [fetchConfig]);

    return config;
}
