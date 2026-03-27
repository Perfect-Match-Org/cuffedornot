import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import { Session } from "next-auth";
import Layout from "@/components/Layout";

export default function App({ Component, pageProps }: AppProps<{ session: Session }>) {
    const { session, ...rest } = pageProps;
    return (
        <SessionProvider session={session}>
            <Layout>
                <Component {...rest} />
            </Layout>
        </SessionProvider>
    );
}
