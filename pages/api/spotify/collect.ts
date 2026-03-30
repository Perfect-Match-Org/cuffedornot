import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { connect, CuffedOrNotUser } from '@/database';
import { spotifyFetch } from '@/lib/spotifyFetch';
import {
    computeAudioFeatureAverages,
    computeAvgTrackAgeYears,
    extractTopGenres,
} from '@/lib/spotifyProcess';
import {
    computeFinalScore,
    computeESValue,
    computeRentfrowVector,
    computeMoodQuadrant,
    computeGenreDiversity,
    detectRedFlagArtists,
    computeListeningPersonality,
    generateRoastLines,
} from '@/lib/score';
import { generateEvidenceBullets } from '@/lib/evidenceBullets';
import {
    SpotifyTrack,
    SpotifyArtist,
    AudioFeature,
    SpotifyTimeRange,
    SpotifyAuthError,
    SpotifyRateLimitError,
    CollectError,
} from '@/types/spotify';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // 1. Auth check
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) {
        return res.status(401).json({ error: 'NOT_AUTHENTICATED' } satisfies CollectError);
    }

    const { accessToken } = req.body as { accessToken: string };
    if (!accessToken || typeof accessToken !== 'string') {
        return res.status(400).json({ error: 'Missing accessToken' });
    }

    // 2. Connect + atomic rate-limit claim
    await connect();

    const cutoff = new Date(Date.now() - 5 * 60 * 1000);
    const claimed = await CuffedOrNotUser.findOneAndUpdate(
        {
            email: session.user.email,
            $or: [
                { 'spotifyData.lastAttemptAt': { $exists: false } },
                { 'spotifyData.lastAttemptAt': { $lt: cutoff } },
                { 'spotifyData.collectedAt': { $exists: false } },
            ],
        },
        { $set: { 'spotifyData.lastAttemptAt': new Date() } },
        { new: false }
    );

    if (!claimed) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const user = await CuffedOrNotUser.findOne({ email: session.user.email }).lean() as any;
        const lastAttempt: Date | undefined = user?.spotifyData?.lastAttemptAt;
        const retryAfter = lastAttempt
            ? Math.ceil((lastAttempt.getTime() + 5 * 60 * 1000 - Date.now()) / 1000)
            : 300;
        return res.status(429).json({ error: 'RATE_LIMITED', retryAfter } satisfies CollectError);
    }

    // 3. Fire all 6 Spotify calls in parallel
    try {
        const [
            shortTracks, mediumTracks, longTracks,
            shortArtists, mediumArtists, longArtists,
        ] = await Promise.all([
            spotifyFetch(accessToken, '/v1/me/top/tracks?time_range=short_term&limit=50'),
            spotifyFetch(accessToken, '/v1/me/top/tracks?time_range=medium_term&limit=50'),
            spotifyFetch(accessToken, '/v1/me/top/tracks?time_range=long_term&limit=50'),
            spotifyFetch(accessToken, '/v1/me/top/artists?time_range=short_term&limit=50'),
            spotifyFetch(accessToken, '/v1/me/top/artists?time_range=medium_term&limit=50'),
            spotifyFetch(accessToken, '/v1/me/top/artists?time_range=long_term&limit=50'),
        ]);

        const tracksByRange: SpotifyTrack[][] = [
            shortTracks.items ?? [],
            mediumTracks.items ?? [],
            longTracks.items ?? [],
        ];
        const artistsByRange: SpotifyArtist[][] = [
            shortArtists.items ?? [],
            mediumArtists.items ?? [],
            longArtists.items ?? [],
        ];

        // 4. Check for insufficient data
        const totalTracks = tracksByRange.reduce((s, t) => s + t.length, 0);
        if (totalTracks === 0) {
            return res.status(200).json({ error: 'SPOTIFY_INSUFFICIENT_DATA' } satisfies CollectError);
        }

        // 5. Deduplicate track IDs across all ranges for audio feature fetch
        const allTrackIds = Array.from(
            new Set(tracksByRange.flat().map((t) => t.id))
        );

        // 6. Fetch audio features in batches of 100
        const chunks: string[][] = [];
        for (let i = 0; i < allTrackIds.length; i += 100) {
            chunks.push(allTrackIds.slice(i, i + 100));
        }

        const featureResults = await Promise.all(
            chunks.map((ids) =>
                spotifyFetch(accessToken, `/v1/audio-features?ids=${ids.join(',')}`)
            )
        );

        const allFeatures: (AudioFeature | null)[] = featureResults.flatMap((r) => r.audio_features ?? []);
        const featureMap = new Map<string, AudioFeature | null>();
        for (let i = 0; i < allTrackIds.length; i++) {
            featureMap.set(allTrackIds[i], allFeatures[i] ?? null);
        }

        // 7. Build per-range data
        const spotifyTimeRanges: SpotifyTimeRange[] = tracksByRange.map((tracks, idx) => {
            const artists = artistsByRange[idx];
            const trackIds = tracks.map((t) => t.id);
            const artistIds = artists.map((a) => a.id);

            // Build metadata maps for match reveal display
            const trackMeta: Record<string, { name: string; artist: string }> = {};
            for (const t of tracks) {
                trackMeta[t.id] = { name: t.name, artist: t.artists[0]?.name ?? 'Unknown' };
            }
            const artistMeta: Record<string, string> = {};
            for (const a of artists) {
                artistMeta[a.id] = a.name;
            }

            const rangeFeatures = trackIds
                .map((id) => featureMap.get(id) ?? null)
                .filter((f): f is AudioFeature => f !== null);

            const releaseDates = tracks.map((t) => t.album.release_date);
            const avgs = computeAudioFeatureAverages(rangeFeatures, tracks);
            avgs.avgTrackAgeYears = computeAvgTrackAgeYears(releaseDates);

            return {
                trackIds,
                artistIds,
                trackMeta,
                artistMeta,
                audioFeatureAverages: avgs,
                topGenres: extractTopGenres(artists),
            };
        });

        const [shortRange, mediumRange, longRange] = spotifyTimeRanges;

        // 8. Persist spotify data to MongoDB
        await CuffedOrNotUser.findOneAndUpdate(
            { email: session.user.email },
            {
                $set: {
                    'spotifyData.collectedAt': new Date(),
                    'spotifyData.shortTerm': shortRange,
                    'spotifyData.mediumTerm': mediumRange,
                    'spotifyData.longTerm': longRange,
                },
            }
        );

        // 9. Compute scores
        const spotifyDataForScoring = {
            shortTerm: shortRange,
            mediumTerm: mediumRange,
            longTerm: longRange,
        };

        const scoreResult = computeFinalScore(spotifyDataForScoring);
        if (!scoreResult) {
            return res.status(200).json({ error: 'SPOTIFY_INSUFFICIENT_DATA' } satisfies CollectError);
        }

        const esValue = computeESValue(shortRange.audioFeatureAverages, shortRange.topGenres);
        const rentfrowVector = computeRentfrowVector(shortRange.audioFeatureAverages, shortRange.topGenres);
        const moodQuadrant = computeMoodQuadrant(shortRange.audioFeatureAverages);
        const evidenceBullets = generateEvidenceBullets(scoreResult.breakdown, spotifyDataForScoring);

        // 10a. Compute presentation metrics (Sprint 8)
        const genreDiversity = computeGenreDiversity(shortRange.topGenres);
        const redFlagArtists = detectRedFlagArtists([
            shortRange.artistMeta,
            mediumRange?.artistMeta,
            longRange?.artistMeta,
        ]);
        const listeningPersonality = computeListeningPersonality(shortRange.audioFeatureAverages);
        const previousMoodQuadrant = mediumRange
            ? computeMoodQuadrant(mediumRange.audioFeatureAverages)
            : null;
        const roastLines = generateRoastLines(
            shortRange.audioFeatureAverages,
            shortRange.topGenres,
            redFlagArtists,
            mediumRange?.audioFeatureAverages,
            shortRange.audioFeatureAverages.avgTrackAgeYears
        );

        // 10b. Persist scores (including presentation metrics)
        await CuffedOrNotUser.findOneAndUpdate(
            { email: session.user.email },
            {
                $set: {
                    scores: {
                        cuffedOrNotScore: scoreResult.score,
                        verdict: scoreResult.verdict,
                        tagline: scoreResult.tagline,
                        confidence: scoreResult.confidence,
                        esValue,
                        rentfrowVector: Array.from(rentfrowVector),
                        moodQuadrant,
                        genreDiversity,
                        redFlagArtists,
                        listeningPersonality,
                        roastLines,
                        previousMoodQuadrant,
                    },
                },
            }
        );

        return res.status(200).json({
            success: true,
            score: scoreResult.score,
            verdict: scoreResult.verdict,
            tagline: scoreResult.tagline,
            confidence: scoreResult.confidence,
            breakdown: scoreResult.breakdown,
            evidenceBullets,
            genreDiversity,
            redFlagArtists,
            listeningPersonality,
            roastLines,
            previousMoodQuadrant,
            audioFeatures: shortRange.audioFeatureAverages,
        });
    } catch (err) {
        if (err instanceof SpotifyAuthError) {
            return res.status(200).json({ error: 'SPOTIFY_TOKEN_EXPIRED' } satisfies CollectError);
        }
        if (err instanceof SpotifyRateLimitError) {
            return res.status(200).json({
                error: 'SPOTIFY_RATE_LIMITED',
                retryAfter: err.retryAfter,
            } satisfies CollectError);
        }
        console.error('Spotify collect error:', err instanceof Error ? err.message : 'unknown');
        return res.status(500).json({ error: 'Internal server error' });
    }
}
