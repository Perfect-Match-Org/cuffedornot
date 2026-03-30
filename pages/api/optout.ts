import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { connect, CuffedOrNotUser, getConfig } from '@/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) {
        return res.status(401).json({ error: 'NOT_AUTHENTICATED' });
    }

    await connect();

    const config = await getConfig();
    if (!config.optInOpen) {
        return res.status(423).json({ error: 'OPT_IN_CLOSED' });
    }

    await CuffedOrNotUser.findOneAndUpdate(
        { email: session.user.email },
        { $set: { optIn: false } }
    );

    return res.status(200).json({ success: true });
}
