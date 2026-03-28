import { useState, useEffect, useCallback } from 'react';

interface AppConfig {
    optInOpen: boolean;
    matchesReleased: boolean;
    matchingRun: boolean;
}

/**
 * Fetches /api/me on mount and re-fetches whenever the window regains focus.
 * Future optimisation: replace the /api/me call with a dedicated /api/config
 * endpoint that returns only the three boolean flags, avoiding a full DB user
 * lookup on every revalidation.
 */
export function useConfig() {
    const [config, setConfig] = useState<AppConfig | null>(null);

    const fetchConfig = useCallback(async () => {
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
