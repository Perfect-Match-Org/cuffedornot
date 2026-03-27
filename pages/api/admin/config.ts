import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { connect, CuffedOrNotConfig, getConfig } from '@/database';
import { isAdmin } from '@/lib/isAdmin';

const ALLOWED_FIELDS = ['optInOpen', 'matchesReleased', 'matchingRun'] as const;
type ConfigField = typeof ALLOWED_FIELDS[number];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email || !isAdmin(session.user.email)) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    await connect();

    if (req.method === 'GET') {
        const config = await getConfig();
        return res.status(200).json({
            optInOpen: config.optInOpen,
            matchesReleased: config.matchesReleased,
            matchingRun: config.matchingRun,
        });
    }

    if (req.method === 'POST') {
        const { field, value } = req.body as { field: ConfigField; value: boolean };

        if (!ALLOWED_FIELDS.includes(field) || typeof value !== 'boolean') {
            return res.status(400).json({ error: 'Invalid field or value' });
        }

        const config = await getConfig();
        await CuffedOrNotConfig.findByIdAndUpdate(config._id, { $set: { [field]: value } });

        return res.status(200).json({ [field]: value });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
