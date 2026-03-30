import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { connect, CuffedOrNotUser, getConfig } from '@/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
        .select('matchedWith matchPlatonic matchCompatibilityScore')
        .lean();

    if (!user) {
        return res.status(404).json({ error: 'USER_NOT_FOUND' });
    }

    if (!user.matchedWith) {
        return res.status(200).json({ matchesReleased: true, matched: false });
    }

    // Fetch match partner's first name for display
    const partner = await CuffedOrNotUser.findOne({ email: user.matchedWith })
        .select('firstName')
        .lean();

    return res.status(200).json({
        matchesReleased: true,
        matched: true,
        matchedWith: user.matchedWith,
        partnerFirstName: partner?.firstName ?? null,
        platonic: user.matchPlatonic ?? false,
        compatibilityScore: user.matchCompatibilityScore ?? null,
    });
}
