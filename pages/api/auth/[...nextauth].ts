import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { connect, CuffedOrNotUser } from '@/database';
import mongoose from 'mongoose';

const isValidCornellEmail = (email: string): boolean => {
    const domain = email.split('@')[1];
    return domain === 'cornell.edu' || email === 'cornell.perfectmatch@gmail.com';
};

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    pages: { error: '/auth/error' },
    secret: process.env.NEXTAUTH_SECRET,
    session: { strategy: 'jwt' },
    callbacks: {
        async signIn({ profile }) {
            if (!profile || !isValidCornellEmail(profile.email!)) {
                return false;
            }

            try {
                await connect();
                const existing = await CuffedOrNotUser.findOne({ email: profile.email });
                if (!existing) {
                    // Try to get firstName from main users collection
                    let firstName: string | undefined;
                    try {
                        const db = mongoose.connection.db;
                        const mainUser = await db
                            .collection('users')
                            .findOne(
                                { email: profile.email },
                                { projection: { 'profile.firstName': 1 } }
                            );
                        firstName = mainUser?.profile?.firstName;
                    } catch {
                        // ignore — fallback below
                    }

                    if (!firstName) {
                        firstName = (profile as any).given_name || profile.name?.split(' ')[0] || '';
                    }

                    await CuffedOrNotUser.create({
                        email: profile.email,
                        firstName,
                        profileComplete: false,
                    });
                }
            } catch (err) {
                console.error('Error in signIn callback', err);
                return false;
            }

            return true;
        },
    },
};

export default NextAuth(authOptions);
