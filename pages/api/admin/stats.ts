import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { connect, CuffedOrNotUser } from '@/database';
import { isAdmin } from '@/lib/isAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email || !isAdmin(session.user.email)) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    await connect();

    const [totalUsers, spotifyCollected, optedIn, profileComplete] = await Promise.all([
        CuffedOrNotUser.countDocuments({}),
        CuffedOrNotUser.countDocuments({ 'spotifyData.collectedAt': { $exists: true } }),
        CuffedOrNotUser.countDocuments({ optIn: true }),
        CuffedOrNotUser.countDocuments({ profileComplete: true }),
    ]);

    return res.status(200).json({ totalUsers, spotifyCollected, optedIn, profileComplete });
}
