import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { connect, CuffedOrNotUser, getConfig } from '@/database';
import { ISpotifyData } from '@/database/models/cuffedornotUser';
import { TrackMeta } from '@/types/spotify';

// ── Types ────────────────────────────────────────────────────────────────────

interface SharedAnthem {
    name: string;
    artist: string;
}

interface OverlappingArtist {
    id: string;
    name: string;
}

interface MatchPayload {
    firstName: string;
    verdict: string;
    score: number;
    platonic: boolean;
    compatibilityScore: number;
    sharedAnthem: SharedAnthem | null;
    overlappingArtists: OverlappingArtist[];
    overlappingGenres: string[];
    moodQuadrant: string;
    esType: 'Empathizer' | 'Systemizer';
    relationshipForecast: string[];
}

interface MatchApiResponse {
    matchesReleased: boolean;
    optIn?: boolean;
    unmatchable?: boolean;
    myScore?: { score: number; verdict: string; confidence: number } | null;
    match?: MatchPayload | null;
}

// ── Ghost match ───────────────────────────────────────────────────────────────

const GHOST_EMAIL = 'mcgraw-tower-ghost@cornell.edu';

// ── Helpers ───────────────────────────────────────────────────────────────────

// After .lean(), Mongoose Maps become plain objects. Use bracket notation.
function getFromMap<T>(map: unknown, key: string): T | undefined {
    if (!map) return undefined;
    if (map instanceof Map) return map.get(key) as T | undefined;
    return (map as Record<string, T>)[key];
}

const TIME_RANGES = ['shortTerm', 'mediumTerm', 'longTerm'] as const;

function findSharedAnthem(
    myData: ISpotifyData | undefined,
    partnerData: ISpotifyData | undefined
): SharedAnthem | null {
    for (const range of TIME_RANGES) {
        const myRange = myData?.[range];
        const partnerRange = partnerData?.[range];
        if (!myRange || !partnerRange) continue;
        const partnerSet = new Set(partnerRange.trackIds);
        for (const trackId of myRange.trackIds) {
            if (partnerSet.has(trackId)) {
                const meta =
                    getFromMap<TrackMeta>(myRange.trackMeta, trackId) ??
                    getFromMap<TrackMeta>(partnerRange.trackMeta, trackId);
                if (meta) return { name: meta.name, artist: meta.artist };
            }
        }
    }
    return null;
}

function findOverlappingArtists(
    myData: ISpotifyData | undefined,
    partnerData: ISpotifyData | undefined
): OverlappingArtist[] {
    const seen = new Set<string>();
    const results: OverlappingArtist[] = [];
    for (const range of TIME_RANGES) {
        if (results.length >= 3) break;
        const myRange = myData?.[range];
        const partnerRange = partnerData?.[range];
        if (!myRange || !partnerRange) continue;
        const partnerSet = new Set(partnerRange.artistIds);
        for (const artistId of myRange.artistIds) {
            if (results.length >= 3) break;
            if (seen.has(artistId)) continue;
            if (partnerSet.has(artistId)) {
                seen.add(artistId);
                const name =
                    getFromMap<string>(myRange.artistMeta, artistId) ??
                    getFromMap<string>(partnerRange.artistMeta, artistId);
                if (name) results.push({ id: artistId, name });
            }
        }
    }
    return results;
}

function findOverlappingGenres(
    myData: ISpotifyData | undefined,
    partnerData: ISpotifyData | undefined
): string[] {
    const seen = new Set<string>();
    const results: string[] = [];
    for (const range of TIME_RANGES) {
        if (results.length >= 3) break;
        const myRange = myData?.[range];
        const partnerRange = partnerData?.[range];
        if (!myRange || !partnerRange) continue;
        const partnerSet = new Set(partnerRange.topGenres.map((g) => g.genre));
        for (const { genre } of myRange.topGenres) {
            if (results.length >= 3) break;
            if (!seen.has(genre) && partnerSet.has(genre)) {
                seen.add(genre);
                results.push(genre);
            }
        }
    }
    return results;
}

function computeGenreJaccard(
    myData: ISpotifyData | undefined,
    partnerData: ISpotifyData | undefined
): number {
    const myGenres = new Set<string>();
    const partnerGenres = new Set<string>();
    for (const range of TIME_RANGES) {
        myData?.[range]?.topGenres?.forEach((g) => myGenres.add(g.genre));
        partnerData?.[range]?.topGenres?.forEach((g) => partnerGenres.add(g.genre));
    }
    if (myGenres.size === 0 && partnerGenres.size === 0) return 0;
    const intersection = Array.from(myGenres).filter((g) => partnerGenres.has(g)).length;
    const union = new Set(Array.from(myGenres).concat(Array.from(partnerGenres))).size;
    return union === 0 ? 0 : intersection / union;
}

const MOOD_FORECASTS: Record<string, string> = {
    'Social+Social': "Two social butterflies. Your shared playlists will be insufferably upbeat and everyone will be jealous.",
    'Brooding+Brooding': "Two chronic brooders. Your dates will be silent walks and long playlists. Ironically, this works.",
    'Chill+Chill': "Both of you are dangerously low-energy. You'll get along perfectly because neither of you will push the other to do anything.",
    'Intense+Intense': "Two intense listeners in a room together. Unclear if this is a relationship or a standoff. Either way, the music will be loud.",
    'Social+Brooding': "One of you is always ready to go out; the other is always ready to go to bed. Classic push-pull. High stakes, high reward.",
    'Brooding+Social': "One of you is always ready to go out; the other is always ready to go to bed. Classic push-pull. High stakes, high reward.",
    'Social+Chill': "You're the energy, they're the vibe. Together you'll actually manage to have fun without overdoing it.",
    'Chill+Social': "You're the energy, they're the vibe. Together you'll actually manage to have fun without overdoing it.",
    'Social+Intense': "You're here to party; they're here to feel things deeply. Somehow this is extremely compelling.",
    'Intense+Social': "You're here to party; they're here to feel things deeply. Somehow this is extremely compelling.",
    'Brooding+Chill': "One overthinks, the other under-reacts. You'll spend a lot of time sitting in comfortable silence.",
    'Chill+Brooding': "One overthinks, the other under-reacts. You'll spend a lot of time sitting in comfortable silence.",
    'Brooding+Intense': "Two flavors of moody colliding. This is either the best thing that's ever happened or a very specific type of chaos.",
    'Intense+Brooding': "Two flavors of moody colliding. This is either the best thing that's ever happened or a very specific type of chaos.",
    'Chill+Intense': "The Intense one sets the pace; the Chill one grounds it. A surprisingly stable combination.",
    'Intense+Chill': "The Intense one sets the pace; the Chill one grounds it. A surprisingly stable combination.",
};

const ES_FORECASTS: Record<string, string> = {
    'Empathizer+Empathizer': "Two Empathizers. Feelings will be felt, deeply and at length. Bring snacks to the emotional processing sessions.",
    'Systemizer+Systemizer': "Two Systemizers. Your relationship will be efficient, logical, and deeply misunderstood by everyone around you.",
    'Empathizer+Systemizer': "Classic pairing: one leads with feeling, one leads with logic. You'll drive each other slightly crazy in the most productive way.",
    'Systemizer+Empathizer': "Classic pairing: one leads with feeling, one leads with logic. You'll drive each other slightly crazy in the most productive way.",
};

function generateRelationshipForecast(
    myMoodQuadrant: string,
    partnerMoodQuadrant: string,
    genreJaccard: number,
    myEsType: 'Empathizer' | 'Systemizer',
    partnerEsType: 'Empathizer' | 'Systemizer'
): string[] {
    const moodKey = `${myMoodQuadrant}+${partnerMoodQuadrant}`;
    const moodForecast = MOOD_FORECASTS[moodKey];
    if (moodForecast) return [moodForecast];

    if (genreJaccard > 0.5) {
        return ["Your music libraries overlap significantly. You'll never fight over what to play — which means you'll fight about something else instead."];
    }
    if (genreJaccard < 0.15) {
        return ["Your musical worlds barely overlap, which is either a dealbreaker or the most interesting thing about you two. Remains to be seen."];
    }

    const esKey = `${myEsType}+${partnerEsType}`;
    return [ES_FORECASTS[esKey] ?? "The algorithm has run out of things to say. Take that as a good sign."];
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req: NextApiRequest, res: NextApiResponse<MatchApiResponse | { error: string }>) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) {
        return res.status(401).json({ error: 'NOT_AUTHENTICATED' });
    }

    await connect();

    const config = await getConfig();
    if (!config.matchesReleased) {
        return res.status(200).json({ matchesReleased: false });
    }

    const user = await CuffedOrNotUser.findOne({ email: session.user.email })
        .select('optIn unmatchable matchedWith matchPlatonic matchCompatibilityScore scores spotifyData')
        .lean();

    if (!user) {
        return res.status(404).json({ error: 'USER_NOT_FOUND' });
    }

    const myScore = user.scores?.cuffedOrNotScore != null
        ? {
            score: user.scores.cuffedOrNotScore,
            verdict: user.scores.verdict ?? '???',
            confidence: user.scores.confidence ?? 0,
        }
        : null;

    if (user.unmatchable) {
        return res.status(200).json({
            matchesReleased: true,
            optIn: user.optIn,
            unmatchable: true,
            myScore,
            match: null,
        });
    }

    if (!user.matchedWith) {
        return res.status(200).json({
            matchesReleased: true,
            optIn: user.optIn,
            myScore,
            match: null,
        });
    }

    // Ghost match — hardcoded, no DB lookup
    if (user.matchedWith === GHOST_EMAIL) {
        return res.status(200).json({
            matchesReleased: true,
            optIn: user.optIn,
            myScore,
            match: {
                firstName: 'McGraw Tower',
                verdict: 'Terminally Single',
                score: 99,
                platonic: false,
                compatibilityScore: user.matchCompatibilityScore ?? 0,
                sharedAnthem: null,
                overlappingArtists: [],
                overlappingGenres: [],
                moodQuadrant: 'Brooding',
                esType: 'Systemizer',
                relationshipForecast: [
                    "Your music taste is so fiercely independent that we had to pair you with Cornell's biggest solo act. It has incredibly rigid boundaries, plays the exact same setlist every day, and refuses to compromise for anyone. A perfect match.",
                ],
            },
        });
    }

    // Real match
    const partner = await CuffedOrNotUser.findOne({ email: user.matchedWith })
        .select('firstName scores spotifyData')
        .lean();

    if (!partner) {
        return res.status(200).json({
            matchesReleased: true,
            optIn: user.optIn,
            myScore,
            match: null,
        });
    }

    const myEsType: 'Empathizer' | 'Systemizer' =
        (user.scores?.esValue ?? 0) > 0 ? 'Systemizer' : 'Empathizer';
    const partnerEsType: 'Empathizer' | 'Systemizer' =
        (partner.scores?.esValue ?? 0) > 0 ? 'Systemizer' : 'Empathizer';
    const myMoodQuadrant = user.scores?.moodQuadrant ?? 'Brooding';
    const partnerMoodQuadrant = partner.scores?.moodQuadrant ?? 'Brooding';

    const jaccard = computeGenreJaccard(user.spotifyData, partner.spotifyData);

    return res.status(200).json({
        matchesReleased: true,
        optIn: user.optIn,
        myScore,
        match: {
            firstName: partner.firstName ?? 'Your match',
            verdict: partner.scores?.verdict ?? '???',
            score: partner.scores?.cuffedOrNotScore ?? 0,
            platonic: user.matchPlatonic ?? false,
            compatibilityScore: user.matchCompatibilityScore ?? 0,
            sharedAnthem: findSharedAnthem(user.spotifyData, partner.spotifyData),
            overlappingArtists: findOverlappingArtists(user.spotifyData, partner.spotifyData),
            overlappingGenres: findOverlappingGenres(user.spotifyData, partner.spotifyData),
            moodQuadrant: partnerMoodQuadrant,
            esType: partnerEsType,
            relationshipForecast: generateRelationshipForecast(
                myMoodQuadrant,
                partnerMoodQuadrant,
                jaccard,
                myEsType,
                partnerEsType
            ),
        },
    });
}
