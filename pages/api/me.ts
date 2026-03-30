import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { connect, CuffedOrNotUser, getConfig } from '@/database';

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

    const config = await getConfig();

    return res.status(200).json({
        firstName: user.firstName ?? null,
        profileComplete: user.profileComplete,
        optIn: user.optIn,
        profile: user.profile ?? null,
        scores: user.scores ?? null,
        hasSpotifyData: !!user.spotifyData?.collectedAt,
        config: {
            optInOpen: config.optInOpen,
            matchesReleased: config.matchesReleased,
            matchingRun: config.matchingRun,
        },
    });
}
