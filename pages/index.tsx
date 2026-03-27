import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import dynamic from 'next/dynamic';

// Load MainFlow client-side only (uses browser APIs)
const MainFlow = dynamic(() => import('@/components/MainFlow'), { ssr: false });

function HowItWorks() {
    const [open, setOpen] = useState(false);
    return (
        <div className="w-full max-w-lg mx-auto">
            <button
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-2 text-pmblue-500 font-work-sans text-sm hover:opacity-75 transition-opacity cursor-pointer"
                aria-expanded={open}
            >
                <span className={`transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
                How does this work?
            </button>
            {open && (
                <div className="mt-3 rounded-xl border border-pmblue2-500 bg-blue-50 p-4 font-work-sans text-sm text-gray-700 space-y-2">
                    <p>
                        <strong>Why do I need to paste a URL?</strong> Receiptify is a popular Spotify
                        visualization tool. When you visit it, Spotify grants it a temporary access token —
                        that token ends up in your browser&apos;s address bar. We read that token to pull
                        your top tracks and artists directly from Spotify&apos;s API.
                    </p>
                    <p>
                        <strong>What data is accessed?</strong> Your top tracks and artists for the past
                        month, 6 months, and all time. We use this to compute a 5-signal &ldquo;cuffed or
                        not&rdquo; score based on the emotional fingerprint of your listening habits.
                    </p>
                    <p>
                        <strong>Is my data safe?</strong> Your Spotify data is stored only for this event
                        and is never sold or shared outside Cornell PerfectMatch.
                    </p>
                </div>
            )}
        </div>
    );
}

export default function Home() {
    const { data: session, status } = useSession();
    const isLoggedIn = !!session;

    const handleFindOut = () => {
        if (!isLoggedIn) {
            signIn('google');
        } else {
            const el = document.getElementById('submit');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <>
            {/* ── Hero ── */}
            <section className="bg-pmpink2-500 px-6 py-16 sm:py-24 text-center">
                <h1 className="font-dela-gothic text-5xl sm:text-7xl text-pmblue2-800 leading-tight mb-4">
                    Cuffed or Not?
                </h1>
                <p className="font-work-sans text-2xl sm:text-3xl text-pmblue2-800 mb-6">
                    Your Spotify knows.
                </p>
                <p className="font-work-sans text-gray-700 max-w-md mx-auto mb-10 text-base leading-relaxed">
                    It&apos;s April Fools. Submit your Receiptify link, get your cuffed-or-single
                    verdict, and optionally get matched with your musical soulmate.
                </p>
                <button
                    onClick={handleFindOut}
                    className="min-h-[52px] rounded-full border-4 border-pmblue-500 bg-white px-10 py-3 font-work-sans font-semibold text-pmblue-500 text-lg shadow-[4px_4px_0px_#24438d] transition-all hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] cursor-pointer"
                >
                    Find Out
                </button>
            </section>

            {/* ── 3-step explainer ── */}
            <section className="bg-white px-6 py-12 border-b border-pmblue2-500">
                <div className="max-w-2xl mx-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
                        {[
                            {
                                num: '1',
                                title: 'Connect Spotify',
                                desc: 'Visit Receiptify, log in, and copy the URL from your address bar.',
                            },
                            {
                                num: '2',
                                title: 'Get Your Verdict',
                                desc: 'Our algorithm analyses your listening history and issues a verdict.',
                            },
                            {
                                num: '3',
                                title: 'Optional: Get Matched',
                                desc: 'Opt in to be matched with your musical soulmate on April 1.',
                            },
                        ].map((step) => (
                            <div key={step.num} className="flex flex-col items-center gap-3">
                                <span className="w-12 h-12 rounded-full border-4 border-pmblue-500 flex items-center justify-center font-dela-gothic text-pmblue-500 text-xl">
                                    {step.num}
                                </span>
                                <h3 className="font-dela-gothic text-pmblue2-800 text-lg">{step.title}</h3>
                                <p className="font-work-sans text-gray-600 text-sm leading-relaxed">{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── "How does this work?" collapsible ── */}
            <section className="bg-white px-6 py-8 border-b border-pmblue2-500">
                <div className="max-w-lg mx-auto">
                    <HowItWorks />
                </div>
            </section>

            {/* ── Submit / MainFlow ── */}
            <section id="submit" className="bg-white px-6 py-12">
                <div className="max-w-lg mx-auto">
                    {status === 'loading' ? (
                        <div className="flex justify-center py-12">
                            <div className="w-8 h-8 rounded-full border-4 border-pmblue2-500 border-t-pmblue-500 animate-spin" />
                        </div>
                    ) : !isLoggedIn ? (
                        <div className="text-center">
                            <p className="font-work-sans text-gray-600 mb-6">
                                Sign in with your Cornell Google account to get started.
                            </p>
                            <button
                                onClick={() => signIn('google')}
                                className="min-h-[48px] rounded-full border-4 border-pmblue-500 bg-white px-8 py-3 font-work-sans font-semibold text-pmblue-500 shadow-[4px_4px_0px_#24438d] transition-all hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] cursor-pointer"
                            >
                                Sign in with Cornell Google
                            </button>
                        </div>
                    ) : (
                        <MainFlow />
                    )}
                </div>
            </section>

            {/* Sprint 5 opt-in section anchor */}
            <div id="optin-section" />

            {/* ── Footer ── */}
            <footer className="bg-white border-t border-pmblue2-500 px-6 py-6 text-center">
                <p className="font-work-sans text-xs text-gray-400">
                    &copy; Cornell PerfectMatch 2025
                </p>
            </footer>
        </>
    );
}
