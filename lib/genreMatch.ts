import GENRE_SCORES from './genre-scores.json';

const GENRE_KEYS = Object.keys(GENRE_SCORES) as (keyof typeof GENRE_SCORES)[];

export function lookupGenreSadness(genre: string): number {
    const lower = genre.toLowerCase();

    // Pass 1: exact match
    if (lower in GENRE_SCORES) {
        return GENRE_SCORES[lower as keyof typeof GENRE_SCORES];
    }

    // Pass 2: substring match (key inside genre string, or genre inside key)
    for (const key of GENRE_KEYS) {
        if (lower.includes(key) || key.includes(lower)) {
            return GENRE_SCORES[key];
        }
    }

    // Pass 3: word-level match
    const words = lower.split(/[\s\-\/]+/).filter(Boolean);
    for (const word of words) {
        if (word in GENRE_SCORES) {
            return GENRE_SCORES[word as keyof typeof GENRE_SCORES];
        }
        for (const key of GENRE_KEYS) {
            if (key.includes(word) || word.includes(key)) {
                return GENRE_SCORES[key];
            }
        }
    }

    return 0.5;
}
