import { AudioFeature, AudioFeatureAverages, GenreCount, SpotifyArtist } from '@/types/spotify';

function parseReleaseYear(releaseDate: string): number {
    // Handles YYYY, YYYY-MM, YYYY-MM-DD
    return parseInt(releaseDate.split('-')[0], 10);
}

export function computeAudioFeatureAverages(features: (AudioFeature | null)[]): AudioFeatureAverages {
    const valid = features.filter((f): f is AudioFeature => f !== null);

    if (valid.length === 0) {
        return {
            danceability: 0,
            energy: 0,
            valence: 0,
            tempo: 0,
            acousticness: 0,
            instrumentalness: 0,
            liveness: 0,
            speechiness: 0,
            loudness: 0,
            mode: 0,
            minorRatio: 0,
            avgTrackAgeYears: 0,
        };
    }

    const n = valid.length;
    const sum = (key: keyof Pick<AudioFeature, 'danceability' | 'energy' | 'valence' | 'tempo' | 'acousticness' | 'instrumentalness' | 'liveness' | 'speechiness' | 'loudness' | 'mode'>) =>
        valid.reduce((acc, f) => acc + f[key], 0);

    const minorCount = valid.filter((f) => f.mode === 0).length;
    const minorRatio = minorCount / n;

    return {
        danceability: sum('danceability') / n,
        energy: sum('energy') / n,
        valence: sum('valence') / n,
        tempo: sum('tempo') / n,
        acousticness: sum('acousticness') / n,
        instrumentalness: sum('instrumentalness') / n,
        liveness: sum('liveness') / n,
        speechiness: sum('speechiness') / n,
        loudness: sum('loudness') / n,
        mode: sum('mode') / n,
        minorRatio,
        avgTrackAgeYears: 0, // computed separately — requires track release dates
    };
}

export function computeAvgTrackAgeYears(releaseDates: string[]): number {
    if (releaseDates.length === 0) return 0;
    const currentYear = new Date().getFullYear();
    const total = releaseDates.reduce((acc, d) => acc + (currentYear - parseReleaseYear(d)), 0);
    return total / releaseDates.length;
}

export function extractTopGenres(artists: SpotifyArtist[]): GenreCount[] {
    const counts: Record<string, number> = {};
    for (const artist of artists) {
        for (const genre of artist.genres) {
            counts[genre] = (counts[genre] || 0) + 1;
        }
    }
    return Object.entries(counts)
        .map(([genre, count]) => ({ genre, count }))
        .sort((a, b) => b.count - a.count);
}
