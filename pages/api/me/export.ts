import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { connect, CuffedOrNotUser } from '@/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    res.setHeader('Cache-Control', 'no-store');

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) {
        return res.status(401).json({ error: 'NOT_AUTHENTICATED' });
    }

    await connect();

    const user = await CuffedOrNotUser.findOne({ email: session.user.email }).lean();
    if (!user) {
        return res.status(404).json({ error: 'USER_NOT_FOUND' });
    }

    const scores = user.scores;
    const sd = user.spotifyData;

    const exportData = {
        exportedAt: new Date().toISOString(),
        email: user.email,
        firstName: user.firstName ?? null,
        profileComplete: user.profileComplete,
        optIn: user.optIn,
        profile: user.profile ?? null,
        scores: scores ? {
            cuffedOrNotScore: scores.cuffedOrNotScore,
            verdict: scores.verdict,
            tagline: scores.tagline,
            confidence: scores.confidence,
            genreDiversity: scores.genreDiversity,
            redFlagArtists: scores.redFlagArtists,
            listeningPersonality: scores.listeningPersonality,
            roastLines: scores.roastLines,
        } : null,
        spotifyData: sd ? {
            collectedAt: sd.collectedAt,
            shortTerm: sd.shortTerm,
            mediumTerm: sd.mediumTerm,
            longTerm: sd.longTerm,
        } : null,
    };

    // If ?download query param is present, trigger file download
    if (req.query.download !== undefined) {
        const filename = `cuffedornot-export-${Date.now()}.json`;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }

    return res.status(200).json(exportData);
}
