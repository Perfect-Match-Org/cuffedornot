import { SignalBreakdown } from '@/types/spotify';
import { SpotifyDataForScoring } from './score';

function pct(v: number): string {
    return `${Math.round(v * 100)}%`;
}

function round1(v: number): string {
    return v.toFixed(1);
}

export function generateEvidenceBullets(
    breakdown: SignalBreakdown,
    spotifyData: SpotifyDataForScoring
): string[] {
    const bullets: string[] = [];
    const short = spotifyData.shortTerm?.audioFeatureAverages;
    const medium = spotifyData.mediumTerm?.audioFeatureAverages;
    const long = spotifyData.longTerm?.audioFeatureAverages;
    const shortGenres = spotifyData.shortTerm?.topGenres ?? [];

    if (!short) return [];

    // Bullet 1: minor key ratio (signal 1 — always available)
    if (short.minorRatio >= 0.5) {
        bullets.push(
            `Your recent listening is ${pct(short.minorRatio)} minor key — that's a lot of introspection.`
        );
    } else {
        bullets.push(
            `Only ${pct(short.minorRatio)} of your recent tracks are in a minor key — you're relatively upbeat.`
        );
    }

    // Bullet 2: energy drift (signal 2 — requires medium term)
    if (medium && breakdown.signal2 !== null) {
        const energyDiff = medium.energy - short.energy;
        const absDiff = Math.abs(energyDiff);
        if (absDiff >= 0.05) {
            if (energyDiff > 0) {
                bullets.push(
                    `Your energy has dropped ${pct(absDiff)} in the last few months — you're pulling inward.`
                );
            } else {
                bullets.push(
                    `Your energy has risen ${pct(absDiff)} in the last few months — you're on the up.`
                );
            }
        } else {
            bullets.push("Your energy levels have been consistent over the past few months.");
        }
    }

    // Bullet 3: genre shift (signal 3 — requires long term)
    if (long && breakdown.signal3 !== null && shortGenres.length > 0) {
        const longGenres = spotifyData.longTerm?.topGenres ?? [];
        const longSet = new Set(longGenres.map((g) => g.genre));
        const newGenres = shortGenres.filter((g) => !longSet.has(g.genre)).slice(0, 2);
        if (newGenres.length > 0) {
            const names = newGenres.map((g) => g.genre).join(' and ');
            bullets.push(`You've recently shifted toward ${names}.`);
        }
    }

    // Bullet 4: temporal regression — track age (signal 4 — requires long term)
    if (long && breakdown.signal4 !== null && short.avgTrackAgeYears > 0) {
        const age = short.avgTrackAgeYears;
        if (age > 3) {
            bullets.push(
                `You've been reaching back to music from ${round1(age)} years ago on average — nostalgia mode.`
            );
        } else {
            bullets.push(
                `Your recent picks average only ${round1(age)} years old — you're mostly keeping up with new releases.`
            );
        }
    }

    // Bullet 5: valence / happiness
    if (short.valence < 0.35) {
        bullets.push(
            `The overall mood of your recent listening scores ${pct(short.valence)} on the happiness scale — on the low end.`
        );
    } else if (short.valence > 0.65) {
        bullets.push(
            `Your recent listening happiness score is ${pct(short.valence)} — pretty cheerful, actually.`
        );
    }

    // Bullet 6: top genre mention (always useful)
    if (shortGenres.length > 0 && bullets.length < 5) {
        const top = shortGenres[0].genre;
        bullets.push(`Your most-played genre right now is ${top}.`);
    }

    return bullets.slice(0, 5);
}
