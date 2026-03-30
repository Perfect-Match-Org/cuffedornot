import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { connect, CuffedOrNotUser, getConfig } from '@/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST' && req.method !== 'PUT') {
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

    const { genderIdentity, attractionPreference, openToPlatonic } = req.body ?? {};

    if (typeof genderIdentity !== 'string' || genderIdentity.trim() === '') {
        return res.status(400).json({ error: 'INVALID_INPUT', field: 'genderIdentity' });
    }
    if (!Array.isArray(attractionPreference) || attractionPreference.length === 0 || !attractionPreference.every((opt) => typeof opt === 'string')) {
        return res.status(400).json({ error: 'INVALID_INPUT', field: 'attractionPreference' });
    }

    const setFields: Record<string, unknown> = {
        profile: {
            genderIdentity: genderIdentity.trim(),
            attractionPreference,
            openToPlatonic: openToPlatonic === true,
        },
        profileComplete: true,
    };

    // Only set optIn on initial submission, not on profile updates
    if (req.method === 'POST') {
        setFields.optIn = true;
    }

    await CuffedOrNotUser.findOneAndUpdate(
        { email: session.user.email },
        { $set: setFields }
    );

    return res.status(200).json({ success: true });
}
