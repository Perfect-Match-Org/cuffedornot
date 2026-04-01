import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { connect, CuffedOrNotUser } from '@/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

    // Strip internal MongoDB fields and operational-only fields
    const { _id, __v, unmatchable, ...doc } = user as Record<string, unknown>;

    // Clean up spotifyData internals
    if (doc.spotifyData && typeof doc.spotifyData === 'object') {
        const spotify = { ...(doc.spotifyData as Record<string, unknown>) };
        delete spotify.lastAttemptAt;
        doc.spotifyData = spotify;
    }

    const exportData = {
        exportedAt: new Date().toISOString(),
        ...doc,
    };

    // If ?download query param is present, trigger file download
    if (req.query.download !== undefined) {
        const filename = `cuffedornot-export-${Date.now()}.json`;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }

    return res.status(200).json(exportData);
}
