import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { connect, CuffedOrNotUser } from '@/database';
import { isAdmin } from '@/lib/isAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email || !isAdmin(session.user.email)) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    await connect();

    if (req.method === 'GET') {
        const [matchedUsers, unmatchableUsers] = await Promise.all([
            CuffedOrNotUser.find({ matchedWith: { $ne: null } })
                .select('email firstName matchedWith matchPlatonic matchCompatibilityScore')
                .lean(),
            CuffedOrNotUser.find({ unmatchable: true })
                .select('email firstName')
                .lean(),
        ]);

        const seen = new Set<string>();
        const pairs: Array<{
            userA: { email: string; firstName: string | null };
            userB: { email: string; firstName: string | null };
            platonic: boolean;
            compatibilityScore: number | null;
            ghost: boolean;
        }> = [];

        for (const user of matchedUsers) {
            const partnerEmail = user.matchedWith as string;
            const pairKey = [user.email, partnerEmail].sort().join('::');
            if (seen.has(pairKey)) continue;
            seen.add(pairKey);

            const partner = matchedUsers.find((u) => u.email === partnerEmail);
            const ghost = !partner || partner.matchedWith !== user.email;

            pairs.push({
                userA: { email: user.email, firstName: user.firstName ?? null },
                userB: { email: partnerEmail, firstName: partner?.firstName ?? null },
                platonic: user.matchPlatonic ?? false,
                compatibilityScore: user.matchCompatibilityScore ?? null,
                ghost,
            });
        }

        return res.status(200).json({
            pairs,
            unmatchable: unmatchableUsers.map((u) => ({
                email: u.email,
                firstName: u.firstName ?? null,
            })),
        });
    }

    if (req.method === 'POST') {
        const { userA, userB, platonic } = req.body as {
            userA: string;
            userB: string;
            platonic: boolean;
        };

        if (!userA || !userB || typeof platonic !== 'boolean') {
            return res.status(400).json({ error: 'Missing required fields: userA, userB, platonic' });
        }

        if (userA === userB) {
            return res.status(400).json({ error: 'Cannot match a user with themselves' });
        }

        const [docA, docB] = await Promise.all([
            CuffedOrNotUser.findOne({ email: userA }).select('email matchedWith').lean(),
            CuffedOrNotUser.findOne({ email: userB }).select('email matchedWith').lean(),
        ]);

        if (!docA) return res.status(404).json({ error: `User not found: ${userA}` });
        if (!docB) return res.status(404).json({ error: `User not found: ${userB}` });

        if (docA.matchedWith && docA.matchedWith !== userB) {
            return res.status(409).json({ error: `${userA} is already matched with ${docA.matchedWith}` });
        }
        if (docB.matchedWith && docB.matchedWith !== userA) {
            return res.status(409).json({ error: `${userB} is already matched with ${docB.matchedWith}` });
        }

        await CuffedOrNotUser.bulkWrite([
            {
                updateOne: {
                    filter: { email: userA },
                    update: { $set: { matchedWith: userB, matchPlatonic: platonic, unmatchable: false } },
                },
            },
            {
                updateOne: {
                    filter: { email: userB },
                    update: { $set: { matchedWith: userA, matchPlatonic: platonic, unmatchable: false } },
                },
            },
        ]);

        return res.status(200).json({ success: true, userA, userB, platonic });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
