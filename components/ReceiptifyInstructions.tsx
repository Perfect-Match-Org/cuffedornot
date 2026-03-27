export default function ReceiptifyInstructions() {
    return (
        <div className="w-full max-w-lg mx-auto mb-6">
            <h2 className="font-dela-gothic text-lg text-pmblue2-800 mb-4">
                How to get your Receiptify URL
            </h2>
            <ol className="space-y-4">
                {[
                    <>
                        Go to{' '}
                        <a
                            href="https://receiptify.herokuapp.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-pmred-500 underline underline-offset-2 hover:opacity-75 transition-opacity"
                        >
                            receiptify.herokuapp.com
                        </a>
                    </>,
                    'Log in with Spotify and view any receipt',
                    'Copy the full URL from your browser\'s address bar',
                    'Paste it in the box below',
                ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-7 h-7 rounded-full border-2 border-pmblue-500 flex items-center justify-center font-dela-gothic text-pmblue-500 text-sm leading-none">
                            {i + 1}
                        </span>
                        <span className="font-work-sans text-gray-700 pt-0.5">{step}</span>
                    </li>
                ))}
            </ol>

            {/* Screenshot placeholder */}
            <div className="mt-5 rounded-xl bg-gray-100 border border-gray-200 h-28 flex items-center justify-center">
                <span className="font-work-sans text-gray-400 text-sm">Screenshot placeholder</span>
            </div>
        </div>
    );
}
