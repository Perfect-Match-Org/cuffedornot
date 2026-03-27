import { AudioFeatureAverages, GenreCount, SignalBreakdown } from '@/types/spotify';
import { lookupGenreSadness } from './genreMatch';

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function clamp(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v));
}

function nanGuard(v: number, fallback: number): number {
    return isNaN(v) || !isFinite(v) ? fallback : v;
}

// ---------------------------------------------------------------------------
// Signal 1 — Valence Profile (40% weight)
// ---------------------------------------------------------------------------

function tempoFactor(tempo: number): number {
    if (tempo < 80) {
        // linear: 80→0.70
        return 0.70;
    } else if (tempo <= 120) {
        // linear interpolation 80→0.70, 120→0.25
        return 0.70 + ((tempo - 80) / (120 - 80)) * (0.25 - 0.70);
    } else if (tempo <= 140) {
        // linear interpolation 120→0.25, 140→0.10
        return 0.25 + ((tempo - 120) / (140 - 120)) * (0.10 - 0.25);
    } else {
        // > 140 → 0.55
        return 0.55;
    }
}

function loudnessFactor(loudness: number): number {
    if (loudness < -15) return 0.70;
    if (loudness <= -8) return 0.40;
    return 0.15;
}

export function signal1_valenceProfile(short: AudioFeatureAverages): number {
    const score =
        (1 - short.valence) * 0.28 +
        (1 - short.danceability) * 0.17 +
        (1 - short.energy) * 0.13 +
        short.acousticness * 0.10 +
        short.instrumentalness * 0.05 +
        short.minorRatio * 0.15 +
        tempoFactor(short.tempo) * 0.07 +
        loudnessFactor(short.loudness) * 0.05;
    return clamp(nanGuard(score, 0.5), 0, 1);
}

// ---------------------------------------------------------------------------
// Signal 2 — Emotional Drift (25% weight)
// ---------------------------------------------------------------------------

export function signal2_emotionalDrift(
    short: AudioFeatureAverages,
    medium: AudioFeatureAverages
): number {
    const valenceDrift = medium.valence - short.valence;
    const energyDrift = medium.energy - short.energy;
    const danceabilityDrift = medium.danceability - short.danceability;
    const acousticDrift = short.acousticness - medium.acousticness;
    const modeDrift = medium.minorRatio - short.minorRatio;

    const compositeDrift =
        valenceDrift * 0.40 +
        energyDrift * 0.20 +
        danceabilityDrift * 0.15 +
        acousticDrift * 0.15 +
        modeDrift * 0.10;

    const score = 0.5 + clamp(compositeDrift / 0.25, -0.5, 0.5);
    return clamp(nanGuard(score, 0.5), 0, 1);
}

// ---------------------------------------------------------------------------
// Signal 3 — Genre Migration (20% weight)
// ---------------------------------------------------------------------------

export function signal3_genreMigration(
    shortGenres: GenreCount[],
    longGenres: GenreCount[]
): number | null {
    const shortSet = new Set(shortGenres.map((g) => g.genre));
    const longSet = new Set(longGenres.map((g) => g.genre));

    const shortArr = Array.from(shortSet);
    const longArr = Array.from(longSet);
    const unionArr = Array.from(new Set([...shortArr, ...longArr]));
    if (unionArr.length === 0) return null;

    const intersectionArr = shortArr.filter((g) => longSet.has(g));

    const newGenres = shortArr.filter((g) => !longSet.has(g));
    const droppedGenres = longArr.filter((g) => !shortSet.has(g));

    const union = { size: unionArr.length };
    const intersection = { size: intersectionArr.length };

    const jaccardOverlap = intersection.size / union.size;
    const changeIntensity = 1 - jaccardOverlap;

    let migration: number;
    if (newGenres.length === 0 && droppedGenres.length === 0) {
        migration = 0.5;
    } else if (newGenres.length === 0) {
        const avgDropped = droppedGenres.reduce((s, g) => s + lookupGenreSadness(g), 0) / droppedGenres.length;
        migration = (0 - avgDropped) * 0.5 + 0.5;
    } else if (droppedGenres.length === 0) {
        const avgNew = newGenres.reduce((s, g) => s + lookupGenreSadness(g), 0) / newGenres.length;
        migration = (avgNew - 0) * 0.5 + 0.5;
    } else {
        const avgNew = newGenres.reduce((s, g) => s + lookupGenreSadness(g), 0) / newGenres.length;
        const avgDropped = droppedGenres.reduce((s, g) => s + lookupGenreSadness(g), 0) / droppedGenres.length;
        migration = (avgNew - avgDropped) * 0.5 + 0.5;
    }

    const score = 0.5 + (migration - 0.5) * changeIntensity;
    return clamp(nanGuard(score, 0.5), 0, 1);
}

// ---------------------------------------------------------------------------
// Signal 4 — Temporal Regression (10% weight)
// ---------------------------------------------------------------------------

export function signal4_temporalRegression(
    short: AudioFeatureAverages,
    long: AudioFeatureAverages
): number | null {
    if (!short.avgTrackAgeYears || !long.avgTrackAgeYears) return null;
    const drift = short.avgTrackAgeYears - long.avgTrackAgeYears;
    const score = 0.5 + clamp(drift / 5, -0.5, 0.5);
    return clamp(nanGuard(score, 0.5), 0, 1);
}

// ---------------------------------------------------------------------------
// Signal 5 — Popularity Signal (5% weight)
// ---------------------------------------------------------------------------

export function signal5_popularitySignal(short: AudioFeatureAverages): number {
    const score = clamp(0.5 + (50 - short.avgPopularity) * 0.005, 0.35, 0.65);
    return nanGuard(score, 0.5);
}

// ---------------------------------------------------------------------------
// Verdict Tiers
// ---------------------------------------------------------------------------

const VERDICT_TIERS: { minScore: number; maxScore: number; verdict: string; taglines: string[] }[] = [
    {
        minScore: 0,
        maxScore: 15,
        verdict: 'Obnoxiously Cuffed',
        taglines: [
            "We get it, you're in love. Touch grass.",
            "Your playlist is a love letter. Disgusting.",
            "Spotify has filed a restraining order on behalf of single people.",
        ],
    },
    {
        minScore: 15,
        maxScore: 30,
        verdict: 'Suspiciously Taken',
        taglines: [
            "Playlist says relationship, but suspiciously stable.",
            "You're probably fine. Someone likes you. Weird.",
            "Your music is too happy. Something is going on.",
        ],
    },
    {
        minScore: 30,
        maxScore: 42,
        verdict: "It's Complicated",
        taglines: [
            "Situationship energy detected.",
            "The algorithm can't tell if you're okay. Neither can you.",
            "Your music says 'I'm fine' but with an edge.",
        ],
    },
    {
        minScore: 42,
        maxScore: 58,
        verdict: 'Ambiguous',
        taglines: [
            "The algorithm can't tell — and honestly neither can you.",
            "Vibes unclear. Please re-examine your situationship.",
            "50/50. Could be cuffed, could be delusional. Good luck.",
        ],
    },
    {
        minScore: 58,
        maxScore: 72,
        verdict: 'Freshly Single',
        taglines: [
            "The breakup was recent. The playlist confirms it.",
            "Still listening to their shared playlist? Classic.",
            "Your music taste is in the grief stage. We're sorry.",
        ],
    },
    {
        minScore: 72,
        maxScore: 85,
        verdict: 'Painfully Single',
        taglines: [
            "Down bad. Algorithm knows it.",
            "Your Spotify is a cry for help. We heard it.",
            "This playlist belongs in a sad romcom montage.",
        ],
    },
    {
        minScore: 85,
        maxScore: 101,
        verdict: 'Chronically Single',
        taglines: [
            "Your music is a cry for help. We matched you anyway.",
            "You've been down bad so long it's just your personality now.",
            "The algorithm is concerned. Please hydrate and go outside.",
        ],
    },
];

export function getVerdict(score: number): { verdict: string; tagline: string } {
    const tier = VERDICT_TIERS.find((t) => score >= t.minScore && score < t.maxScore)
        ?? VERDICT_TIERS[VERDICT_TIERS.length - 1];
    const tagline = tier.taglines[Math.floor(Math.random() * tier.taglines.length)];
    return { verdict: tier.verdict, tagline };
}

// ---------------------------------------------------------------------------
// Hidden Dimensions
// ---------------------------------------------------------------------------

export function computeESValue(short: AudioFeatureAverages, topGenres: GenreCount[]): number {
    const top5 = topGenres.slice(0, 5);
    const genreEmpathyScore = top5.length > 0
        ? top5.reduce((s, g) => s + lookupGenreSadness(g.genre), 0) / top5.length
        : 0.5;

    const eScore =
        short.acousticness * 0.30 +
        (1 - short.energy) * 0.25 +
        (1 - short.instrumentalness) * 0.15 +
        genreEmpathyScore * 0.30;

    return clamp(eScore - (1 - eScore), -1, 1);
}

function genreAffinity(topGenres: GenreCount[], keywords: string[]): number {
    const total = topGenres.reduce((s, g) => s + g.count, 0);
    if (total === 0) return 0;
    const matched = topGenres
        .filter((g) => keywords.some((kw) => g.genre.toLowerCase().includes(kw)))
        .reduce((s, g) => s + g.count, 0);
    return matched / total;
}

export function computeRentfrowVector(
    short: AudioFeatureAverages,
    topGenres: GenreCount[]
): [number, number, number, number] {
    const R =
        short.acousticness * 0.5 +
        genreAffinity(topGenres, ['jazz', 'classical', 'folk', 'blues']) * 0.5;

    const I =
        short.energy * 0.4 +
        (short.loudness > -8 ? 0.3 : 0) +
        genreAffinity(topGenres, ['rock', 'metal', 'punk', 'alternative', 'hardcore']) * 0.3;

    const U =
        short.valence * 0.4 +
        short.danceability * 0.3 +
        genreAffinity(topGenres, ['pop', 'country', 'gospel', 'christian']) * 0.3;

    const E =
        short.energy * 0.3 +
        short.danceability * 0.4 +
        genreAffinity(topGenres, ['hip hop', 'hip-hop', 'r&b', 'electronic', 'dance', 'edm', 'house']) * 0.3;

    const sum = R + I + U + E || 1;
    return [R / sum, I / sum, U / sum, E / sum];
}

export function computeMoodQuadrant(short: AudioFeatureAverages): 'Social' | 'Chill' | 'Intense' | 'Brooding' {
    const highV = short.valence >= 0.5;
    const highE = short.energy >= 0.5;
    if (highV && highE) return 'Social';
    if (highV && !highE) return 'Chill';
    if (!highV && highE) return 'Intense';
    return 'Brooding';
}

// ---------------------------------------------------------------------------
// Final Score Computation
// ---------------------------------------------------------------------------

export interface SpotifyDataForScoring {
    shortTerm?: {
        audioFeatureAverages: AudioFeatureAverages;
        topGenres: GenreCount[];
    };
    mediumTerm?: {
        audioFeatureAverages: AudioFeatureAverages;
        topGenres: GenreCount[];
    };
    longTerm?: {
        audioFeatureAverages: AudioFeatureAverages;
        topGenres: GenreCount[];
    };
}

export function computeFinalScore(spotifyData: SpotifyDataForScoring): {
    score: number;
    confidence: number;
    verdict: string;
    tagline: string;
    breakdown: SignalBreakdown;
} | null {
    const short = spotifyData.shortTerm?.audioFeatureAverages;
    if (!short) return null;

    const medium = spotifyData.mediumTerm?.audioFeatureAverages;
    const long = spotifyData.longTerm?.audioFeatureAverages;
    const shortGenres = spotifyData.shortTerm?.topGenres ?? [];
    const longGenres = spotifyData.longTerm?.topGenres ?? [];

    const s1 = signal1_valenceProfile(short);
    const s2 = medium ? signal2_emotionalDrift(short, medium) : null;
    const s3 = long ? signal3_genreMigration(shortGenres, longGenres) : null;
    const s4 = long ? signal4_temporalRegression(short, long) : null;
    const s5 = signal5_popularitySignal(short);

    const breakdown: SignalBreakdown = {
        signal1: s1,
        signal2: s2,
        signal3: s3,
        signal4: s4,
        signal5: s5,
    };

    let weightedScore: number;

    if (s2 !== null && s3 !== null && s4 !== null) {
        // All 5 signals: 0.40 / 0.25 / 0.20 / 0.10 / 0.05
        weightedScore = s1 * 0.40 + s2 * 0.25 + s3 * 0.20 + s4 * 0.10 + s5 * 0.05;
    } else if (s3 !== null && s4 !== null) {
        // short + long only (no medium): skip signal 2, renormalize 1,3,4,5 → 0.53/0.27/0.13/0.07
        weightedScore = s1 * 0.53 + s3 * 0.27 + s4 * 0.13 + s5 * 0.07;
    } else {
        // short only: signals 1 + 5 → 0.89/0.11
        weightedScore = s1 * 0.89 + s5 * 0.11;
    }

    const score = clamp(nanGuard(weightedScore * 100, 50), 0, 100);
    const confidence = Math.abs(score - 50) * 2;
    const { verdict, tagline } = getVerdict(score);

    return { score, confidence, verdict, tagline, breakdown };
}
