export interface SpotifyTrack {
    id: string;
    name: string;
    album: {
        release_date: string;
    };
    artists: { id: string; name: string }[];
}

export interface SpotifyArtist {
    id: string;
    name: string;
    genres: string[];
}

export interface AudioFeature {
    id: string;
    danceability: number;
    energy: number;
    valence: number;
    tempo: number;
    acousticness: number;
    instrumentalness: number;
    liveness: number;
    speechiness: number;
    loudness: number;
    mode: number; // 0 = minor, 1 = major
    // null entries exist for local files / podcasts
}

export interface AudioFeatureAverages {
    danceability: number;
    energy: number;
    valence: number;
    tempo: number;
    acousticness: number;
    instrumentalness: number;
    liveness: number;
    speechiness: number;
    loudness: number;
    mode: number;
    minorRatio: number;
    avgTrackAgeYears: number;
}

export interface GenreCount {
    genre: string;
    count: number;
}

export interface SpotifyTimeRange {
    trackIds: string[];
    artistIds: string[];
    audioFeatureAverages: AudioFeatureAverages;
    topGenres: GenreCount[];
}

// Typed error classes
export class SpotifyAuthError extends Error {
    constructor() {
        super('Spotify token expired or invalid');
        this.name = 'SpotifyAuthError';
    }
}

export class SpotifyRateLimitError extends Error {
    retryAfter: number;
    constructor(retryAfter: number) {
        super(`Spotify rate limited, retry after ${retryAfter}s`);
        this.name = 'SpotifyRateLimitError';
        this.retryAfter = retryAfter;
    }
}

export class SpotifyFetchError extends Error {
    status: number;
    constructor(status: number) {
        super(`Spotify fetch failed with status ${status}`);
        this.name = 'SpotifyFetchError';
        this.status = status;
    }
}

export type CollectErrorCode =
    | 'SPOTIFY_TOKEN_EXPIRED'
    | 'SPOTIFY_RATE_LIMITED'
    | 'SPOTIFY_INSUFFICIENT_DATA'
    | 'RATE_LIMITED'
    | 'NOT_AUTHENTICATED';

export interface CollectError {
    error: CollectErrorCode;
    retryAfter?: number;
}
