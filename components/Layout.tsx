import Head from 'next/head';
import Link from 'next/link';
import { ReactNode } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

interface LayoutProps {
    children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
    const { data: session } = useSession();

    return (
        <>
            <Head>
                <title>CuffedOrNot</title>
                <meta name="description" content="CuffedOrNot — are you getting cuffed this season?" />
            </Head>
            <div className="min-h-screen bg-white font-work-sans">
                <nav className="w-full border-b border-pmblue2-500 bg-pmpink-500 px-6 py-4 flex items-center">
                    <Link
                        href="/"
                        className="font-dela-gothic text-pmblue2-800 text-xl tracking-tight hover:text-pmred-500 transition-colors"
                    >
                        CuffedOrNot
                    </Link>
                    {session && (
                        <button
                            onClick={() => signOut({ callbackUrl: '/' })}
                            className="ml-auto font-work-sans text-sm text-pmblue2-800 hover:text-pmred-500 transition-colors cursor-pointer"
                        >
                            Sign out
                        </button>
                    )}
                </nav>
                <main className="overflow-x-hidden">{children}</main>
            </div>
            <Analytics />
            <SpeedInsights />
        </>
    );
}
