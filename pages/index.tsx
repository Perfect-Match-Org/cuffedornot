import { useSession, signIn } from "next-auth/react";

export default function Home() {
    const { data: session, status } = useSession();

    if (status === "loading") {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <p className="text-gray-500 font-work-sans">Loading...</p>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
                <h1 className="font-dela-gothic text-4xl text-pmblue2-800 mb-3">CuffedOrNot</h1>
                <p className="text-gray-600 font-work-sans mb-8 max-w-sm">
                    Find out if you&apos;re getting cuffed this season. Sign in with your Cornell email to get started.
                </p>
                <button
                    onClick={() => signIn("google")}
                    className="rounded-full border-2 border-pmblue-500 px-8 py-3 text-pmblue-500 font-semibold shadow-[4px_4px_0px_#24438d] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all font-work-sans"
                >
                    Sign in with Cornell Google
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
            <h1 className="font-dela-gothic text-4xl text-pmblue2-800 mb-3">CuffedOrNot</h1>
            <p className="text-gray-600 font-work-sans mb-2">
                Signed in as <strong>{session.user?.email}</strong>
            </p>
            <p className="text-gray-500 font-work-sans text-sm">
                Spotify submission coming soon.
            </p>
        </div>
    );
}
