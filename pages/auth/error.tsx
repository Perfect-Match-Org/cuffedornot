import Link from 'next/link';

export default function AuthError() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white font-work-sans px-4">
            <h1 className="text-3xl font-bold font-dela-gothic text-pmred-500 mb-4">Sign-in failed</h1>
            <p className="text-gray-700 mb-6 text-center max-w-sm">
                Only Cornell University email addresses (<strong>@cornell.edu</strong>) are allowed to sign in.
            </p>
            <Link
                href="/"
                className="rounded-full border-2 border-pmblue-500 px-6 py-2 text-pmblue-500 font-semibold shadow-[3px_3px_0px_#24438d] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all"
            >
                Back to home
            </Link>
        </div>
    );
}
