import { SpotifyAuthError, SpotifyRateLimitError, SpotifyFetchError } from '@/types/spotify';

const SPOTIFY_API_BASE = 'https://api.spotify.com';

export async function spotifyFetch(accessToken: string, path: string): Promise<any> {
    const res = await fetch(`${SPOTIFY_API_BASE}${path}`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (res.status === 401) {
        throw new SpotifyAuthError();
    }

    if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('Retry-After') || '60', 10);
        throw new SpotifyRateLimitError(retryAfter);
    }

    if (!res.ok) {
        throw new SpotifyFetchError(res.status);
    }

    return res.json();
}
