import GENRE_SCORES from './genre-scores.json';

const GENRE_KEYS = Object.keys(GENRE_SCORES) as (keyof typeof GENRE_SCORES)[];

export function lookupGenreSadness(genre: string): number {
    const lower = genre.toLowerCase();

    // Pass 1: exact match
    if (lower in GENRE_SCORES) {
        return GENRE_SCORES[lower as keyof typeof GENRE_SCORES];
    }

    // Pass 2: longest key that appears as a substring of the genre string
    let bestMatch = '';
    for (const key of GENRE_KEYS) {
        if (lower.includes(key) && key.length > bestMatch.length) {
            bestMatch = key;
        }
    }
    if (bestMatch) {
        return GENRE_SCORES[bestMatch as keyof typeof GENRE_SCORES];
    }

    // Pass 3: word-level exact match (fallback)
    const words = lower.split(/[\s\-\/]+/).filter(Boolean);
    for (const word of words) {
        if (word in GENRE_SCORES) {
            return GENRE_SCORES[word as keyof typeof GENRE_SCORES];
        }
    }

    return 0.5;
}
