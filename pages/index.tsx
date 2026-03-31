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
                <svg
                    className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                >
                    <path d="M6.293 4.293a1 1 0 011.414 0L14 10.586l-6.293 6.293a1 1 0 01-1.414-1.414L11.172 10.5 6.293 5.707a1 1 0 010-1.414z" />
                </svg>
                How does this work?
            </button>
            <div
                className="grid transition-[grid-template-rows] duration-300 ease-out"
                style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
            >
                <div className="overflow-hidden">
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
                </div>
            </div>
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
            <section
                className="relative px-6 py-20 sm:py-32 text-center overflow-hidden"
                style={{
                    background: 'radial-gradient(ellipse at 50% 0%, #ffffff 0%, #FFC8E3 45%, #FFB8D8 100%)',
                }}
            >
                {/* Decorative soft circle */}
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] sm:w-[900px] sm:h-[900px] rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.45) 0%, transparent 70%)' }}
                    aria-hidden="true"
                />
                {/* Bottom accent line */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-pmblue-500/20" aria-hidden="true" />

                <div className="relative max-w-2xl mx-auto">
                    <h1 className="font-dela-gothic text-5xl sm:text-7xl lg:text-8xl text-pmblue2-800 leading-[0.95] mb-5">
                        Cuffed
                        <br />
                        <span className="text-pmred-500">or Not?</span>
                    </h1>
                    <p className="font-dela-gothic text-xl sm:text-2xl text-pmblue2-800 mb-6">
                        Your Spotify knows.
                    </p>
                    <p className="font-work-sans text-pmblue-500 max-w-lg mx-auto mb-10 text-base sm:text-lg leading-relaxed">
                        Your listening history reveals more than you think.
                        We&apos;ll tell you if your Spotify says &ldquo;taken&rdquo; or &ldquo;terminally single.&rdquo;
                    </p>
                    <button
                        onClick={handleFindOut}
                        className="min-h-[52px] rounded-full border-4 border-pmblue-500 bg-white px-10 py-3 font-work-sans font-semibold text-pmred-500 text-lg shadow-[6px_6px_0px_0px_rgba(36,67,141,1)] transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[2px_2px_0px_0px_rgba(36,67,141,1)] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none cursor-pointer"
                    >
                        Find Out
                    </button>
                </div>
            </section>

            {/* ── 3-step explainer ── */}
            <section className="bg-white px-6 py-14 border-b border-pmblue2-500">
                <div className="max-w-3xl mx-auto">
                    <h2 className="font-dela-gothic text-pmblue2-800 text-2xl text-center mb-10">
                        How It Works
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
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
                            <div
                                key={step.num}
                                className="flex flex-col items-center gap-3 rounded-2xl border-2 border-pmblue2-500 bg-white p-6 shadow-[3px_3px_0px_0px_rgba(36,67,141,1)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[5px_5px_0px_0px_rgba(36,67,141,1)]"
                            >
                                <span className="w-14 h-14 rounded-full bg-pmblue-500 flex items-center justify-center font-dela-gothic text-white text-xl">
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
                                className="min-h-[48px] rounded-full border-4 border-pmblue-500 bg-white px-8 py-3 font-work-sans font-semibold text-pmred-500 shadow-[6px_6px_0px_0px_rgba(36,67,141,1)] transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[2px_2px_0px_0px_rgba(36,67,141,1)] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none cursor-pointer"
                            >
                                Sign in with Cornell Google
                            </button>
                        </div>
                    ) : (
                        <MainFlow />
                    )}
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="bg-white border-t border-pmblue2-500 px-6 py-6 text-center">
                <p className="font-work-sans text-xs text-gray-400">
                    &copy; Cornell PerfectMatch 2026
                </p>
            </footer>
        </>
    );
}
