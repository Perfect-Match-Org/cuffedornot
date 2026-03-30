import Link from 'next/link';
import { NextPageContext } from 'next';

interface ErrorProps {
    statusCode: number | undefined;
}

function ErrorPage({ statusCode }: ErrorProps) {
    return (
        <div className="flex items-center justify-center min-h-[80vh] px-6">
            <div className="max-w-sm w-full text-center space-y-4">
                <h1 className="font-dela-gothic text-6xl text-pmred-500">
                    {statusCode ?? 'Oops'}
                </h1>
                <p className="font-work-sans text-gray-600">
                    Something went wrong. The algorithm is having a moment.
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

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
    const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
    return { statusCode };
};

export default ErrorPage;
