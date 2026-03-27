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
    SpotifyTrack,
    SpotifyArtist,
    AudioFeature,
    SpotifyTimeRange,
    SpotifyAuthError,
    SpotifyRateLimitError,
    CollectError,
} from '@/types/spotify';

const TIME_RANGES = ['short_term', 'medium_term', 'long_term'] as const;

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

            const rangeFeatures = trackIds
                .map((id) => featureMap.get(id) ?? null)
                .filter((f): f is AudioFeature => f !== null);

            const releaseDates = tracks.map((t) => t.album.release_date);
            const avgs = computeAudioFeatureAverages(rangeFeatures);
            avgs.avgTrackAgeYears = computeAvgTrackAgeYears(releaseDates);

            return {
                trackIds,
                artistIds,
                audioFeatureAverages: avgs,
                topGenres: extractTopGenres(artists),
            };
        });

        const [shortRange, mediumRange, longRange] = spotifyTimeRanges;

        // 8. Persist to MongoDB
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

        return res.status(200).json({
            success: true,
            summary: {
                shortTermTracks: shortRange.trackIds.length,
                mediumTermTracks: mediumRange.trackIds.length,
                longTermTracks: longRange.trackIds.length,
            },
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
