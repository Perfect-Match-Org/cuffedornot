import { useState, useEffect, useCallback } from 'react';

interface AppConfig {
    optInOpen: boolean;
    matchesReleased: boolean;
    matchingRun: boolean;
}

export function useConfig(pollIntervalMs = 30_000) {
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
        const id = setInterval(fetchConfig, pollIntervalMs);
        return () => clearInterval(id);
    }, [fetchConfig, pollIntervalMs]);

    return config;
}
