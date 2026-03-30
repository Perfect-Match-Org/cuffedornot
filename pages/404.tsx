import Link from 'next/link';

export default function Custom404() {
    return (
        <div className="flex items-center justify-center min-h-[80vh] px-6">
            <div className="max-w-sm w-full text-center space-y-4">
                <h1 className="font-dela-gothic text-6xl text-pmred-500">404</h1>
                <p className="font-work-sans text-gray-600">
                    This page doesn&apos;t exist. Maybe your music taste is just as lost.
                </p>
                <Link
                    href="/"
                    className="inline-block min-h-[44px] rounded-full border-2 border-pmblue-500 px-6 py-2 font-work-sans text-sm text-pmblue-500 hover:bg-pmblue2-500 transition-colors leading-[40px]"
                >
                    Back to home
                </Link>
            </div>
        </div>
    );
}
