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

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 100));
    const search = (req.query.search as string) || '';

    const filter: Record<string, unknown> = {};
    if (search) {
        filter.email = { $regex: search, $options: 'i' };
    }

    const [docs, total] = await Promise.all([
        CuffedOrNotUser.find(filter)
            .select('email firstName profileComplete optIn unmatchable matchedWith matchPlatonic scores.verdict scores.cuffedOrNotScore spotifyData.collectedAt')
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        CuffedOrNotUser.countDocuments(filter),
    ]);

    const users = docs.map((u) => ({
        email: u.email,
        firstName: u.firstName ?? null,
        profileComplete: u.profileComplete,
        optIn: u.optIn,
        unmatchable: u.unmatchable ?? false,
        matchedWith: u.matchedWith ?? null,
        matchPlatonic: u.matchPlatonic ?? false,
        hasSpotifyData: !!u.spotifyData?.collectedAt,
        verdict: u.scores?.verdict ?? null,
        cuffedOrNotScore: u.scores?.cuffedOrNotScore ?? null,
    }));

    return res.status(200).json({
        users,
        total,
        page,
        totalPages: Math.ceil(total / limit),
    });
}
