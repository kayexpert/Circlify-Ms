"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Outfit } from "next/font/google";

const outfit = Outfit({
    subsets: ["latin"],
    variable: "--font-outfit",
    display: "swap",
});

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        Sentry.captureException(error);
    }, [error]);

    return (
        <html lang="en" className={outfit.variable}>
            <body className="font-sans antialiased h-full flex items-center justify-center bg-background text-foreground">
                <div className="flex flex-col items-center gap-4 text-center p-4">
                    <h1 className="text-4xl font-bold">Something went wrong!</h1>
                    <p className="text-muted-foreground max-w-md">
                        A critical error occurred. Please try refreshing the page.
                    </p>
                    <Button onClick={() => reset()}>Try again</Button>
                </div>
            </body>
        </html>
    );
}
