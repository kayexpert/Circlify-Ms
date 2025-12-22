"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export function CheckEmailPageClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get("email") || "";
    const [isResending, setIsResending] = useState(false);
    const [canResend, setCanResend] = useState(false);
    const [countdown, setCountdown] = useState(60);

    useEffect(() => {
        // Countdown timer for resend button
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            setCanResend(true);
        }
    }, [countdown]);

    const handleResendEmail = async () => {
        if (!email || !canResend) return;

        setIsResending(true);
        const supabase = createClient();

        try {
            const { error } = await supabase.auth.resend({
                type: "signup",
                email: email,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback?type=signup`,
                },
            });

            if (error) {
                toast.error("Failed to resend email. Please try again.");
            } else {
                toast.success("Verification email sent! Please check your inbox.");
                setCanResend(false);
                setCountdown(60);
            }
        } catch (error) {
            toast.error("An error occurred. Please try again.");
        } finally {
            setIsResending(false);
        }
    };

    const openEmailProvider = (provider: string) => {
        const providers: Record<string, string> = {
            gmail: "https://mail.google.com",
            apple: "message://",
            yahoo: "https://mail.yahoo.com",
            outlook: "https://outlook.live.com/mail",
        };

        const url = providers[provider];
        if (url) {
            window.open(url, "_blank", "noopener,noreferrer");
        }
    };

    return (
        <div className="flex flex-col flex-1 lg:w-1/2 w-full overflow-y-auto no-scrollbar">
            <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto sm:pt-10 px-6">
                <div className="text-center">
                    {/* Email Icon */}
                    <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-2xl bg-brand-50 dark:bg-brand-950/30">
                        <Mail className="w-8 h-8 text-brand-500 dark:text-brand-400" />
                    </div>

                    {/* Heading */}
                    <h1 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
                        Almost there!
                    </h1>

                    <p className="mb-8 text-base text-gray-600 dark:text-gray-400">
                        Check your email to verify your account.
                    </p>

                    {email && (
                        <p className="mb-8 text-sm text-gray-500 dark:text-gray-500">
                            We sent a verification link to{" "}
                            <span className="font-medium text-gray-900 dark:text-white">
                                {email}
                            </span>
                        </p>
                    )}

                    {/* Quick Email Access Buttons */}
                    <div className="space-y-3 mb-8">
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => openEmailProvider("gmail")}
                                className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 transition-colors bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:border-gray-700"
                            >
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 20 20"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        d="M18.7511 10.1944C18.7511 9.47495 18.6915 8.94995 18.5626 8.40552H10.1797V11.6527H15.1003C15.0011 12.4597 14.4654 13.675 13.2749 14.4916L13.2582 14.6003L15.9087 16.6126L16.0924 16.6305C17.7788 15.1041 18.7511 12.8583 18.7511 10.1944Z"
                                        fill="#4285F4"
                                    />
                                    <path
                                        d="M10.1788 18.75C12.5895 18.75 14.6133 17.9722 16.0915 16.6305L13.274 14.4916C12.5201 15.0068 11.5081 15.3666 10.1788 15.3666C7.81773 15.3666 5.81379 13.8402 5.09944 11.7305L4.99473 11.7392L2.23868 13.8295L2.20264 13.9277C3.67087 16.786 6.68674 18.75 10.1788 18.75Z"
                                        fill="#34A853"
                                    />
                                    <path
                                        d="M5.10014 11.7305C4.91165 11.186 4.80257 10.6027 4.80257 9.99992C4.80257 9.3971 4.91165 8.81379 5.09022 8.26935L5.08523 8.1534L2.29464 6.02954L2.20333 6.0721C1.5982 7.25823 1.25098 8.5902 1.25098 9.99992C1.25098 11.4096 1.5982 12.7415 2.20333 13.9277L5.10014 11.7305Z"
                                        fill="#FBBC05"
                                    />
                                    <path
                                        d="M10.1789 4.63331C11.8554 4.63331 12.9864 5.34303 13.6312 5.93612L16.1511 3.525C14.6035 2.11528 12.5895 1.25 10.1789 1.25C6.68676 1.25 3.67088 3.21387 2.20264 6.07218L5.08953 8.26943C5.81381 6.15972 7.81776 4.63331 10.1789 4.63331Z"
                                        fill="#EB4335"
                                    />
                                </svg>
                                Open Gmail
                            </button>

                            <button
                                onClick={() => openEmailProvider("apple")}
                                className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 transition-colors bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:border-gray-700"
                            >
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 20 20"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        d="M17.5 14.5C17.5 15.605 16.605 16.5 15.5 16.5H4.5C3.395 16.5 2.5 15.605 2.5 14.5V5.5C2.5 4.395 3.395 3.5 4.5 3.5H15.5C16.605 3.5 17.5 4.395 17.5 5.5V14.5Z"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                    />
                                    <path
                                        d="M2.5 6.5L8.75 11.25C9.4625 11.7625 10.5375 11.7625 11.25 11.25L17.5 6.5"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                    />
                                </svg>
                                Open Apple Mail
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => openEmailProvider("yahoo")}
                                className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 transition-colors bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:border-gray-700"
                            >
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 20 20"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        d="M3 4L9 12V16H11V12L17 4H14.5L10 10.5L5.5 4H3Z"
                                        fill="#6001D2"
                                    />
                                </svg>
                                Open Yahoo Mail
                            </button>

                            <button
                                onClick={() => openEmailProvider("outlook")}
                                className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 transition-colors bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:border-gray-700"
                            >
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 20 20"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        d="M18 4.5V15.5C18 16.0523 17.5523 16.5 17 16.5H3C2.44772 16.5 2 16.0523 2 15.5V4.5C2 3.94772 2.44772 3.5 3 3.5H17C17.5523 3.5 18 3.94772 18 4.5Z"
                                        fill="#0078D4"
                                    />
                                    <path
                                        d="M2 5.5L10 10.5L18 5.5"
                                        stroke="white"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                    />
                                </svg>
                                Open Outlook
                            </button>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200 dark:border-gray-800"></div>
                        </div>
                    </div>

                    {/* Spam folder reminder */}
                    <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
                        If you haven&apos;t received the email after 5 minutes, please check your spam
                        folder or{" "}
                        <button
                            onClick={handleResendEmail}
                            disabled={!canResend || isResending}
                            className="font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:text-gray-400"
                        >
                            {isResending ? (
                                "Sending..."
                            ) : canResend ? (
                                "resend email"
                            ) : (
                                `resend email (${countdown}s)`
                            )}
                        </button>
                        .
                    </p>

                    {/* Help Section */}
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span>Need help?</span>
                        <Link
                            href="mailto:support@circlify.com"
                            className="font-medium text-gray-900 dark:text-white hover:text-brand-500 dark:hover:text-brand-400"
                        >
                            Contact us
                        </Link>
                    </div>

                    {/* Back to sign in */}
                    <div className="mt-8">
                        <Link
                            href="/signin"
                            className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                        >
                            ← Back to sign in
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
