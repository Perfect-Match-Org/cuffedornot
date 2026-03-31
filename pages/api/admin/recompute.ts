import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { connect, CuffedOrNotUser } from '@/database';
import { isAdmin } from '@/lib/isAdmin';
import { 
    computeFinalScore,
    computeESValue,
    computeRentfrowVector,
    computeMoodQuadrant
} from '@/lib/score';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    await connect();

    if (!isAdmin(session.user.email)) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        const users = await CuffedOrNotUser.find({
            'spotifyData.collectedAt': { $exists: true, $ne: null }
        }).select('email spotifyData scores').lean();

        let updatedCount = 0;

        for (const user of users) {
            const sd = user.spotifyData;
            if (!sd || !sd.shortTerm) continue; // Safety check

            // Construct payload for computeFinalScore
            const spotifyDataForScoring = {
                shortTerm: {
                    audioFeatureAverages: sd.shortTerm.audioFeatureAverages,
                    topGenres: sd.shortTerm.topGenres,
                },
                mediumTerm: sd.mediumTerm ? {
                    audioFeatureAverages: sd.mediumTerm.audioFeatureAverages,
                    topGenres: sd.mediumTerm.topGenres,
                } : undefined,
                longTerm: sd.longTerm ? {
                    audioFeatureAverages: sd.longTerm.audioFeatureAverages,
                    topGenres: sd.longTerm.topGenres,
                } : undefined,
            };

            const scoreResult = computeFinalScore(spotifyDataForScoring);
            if (!scoreResult) continue;

            const esValue = computeESValue(sd.shortTerm.audioFeatureAverages, sd.shortTerm.topGenres);
            const rentfrowVector = computeRentfrowVector(sd.shortTerm.audioFeatureAverages, sd.shortTerm.topGenres);
            const moodQuadrant = computeMoodQuadrant(sd.shortTerm.audioFeatureAverages);

            const computedScores = {
                ...scoreResult,
                esValue,
                rentfrowVector,
                moodQuadrant,
            };

            await CuffedOrNotUser.updateOne(
                { email: user.email },
                { $set: { scores: computedScores } }
            );

            updatedCount++;
        }

        return res.status(200).json({ 
            success: true, 
            message: `Successfully recomputed scores for ${updatedCount} users.`
        });

    } catch (error) {
        console.error('Recompute Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
