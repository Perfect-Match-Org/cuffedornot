import Head from 'next/head';
import Link from 'next/link';
import { ReactNode } from 'react';

interface LayoutProps {
    children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
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
                </nav>
                <main>{children}</main>
            </div>
        </>
    );
}
