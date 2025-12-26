"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSupabase } from "@/contexts/auth-context";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { toast } from "sonner";
import { PageTransition } from "@/components/auth/page-transition";
import { AuthPrimaryButton, AuthGoogleButton } from "@/components/auth/auth-components";
import { useQueryClient } from "@tanstack/react-query";

const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type SignInFormData = z.infer<typeof signInSchema>;

// Separate component for searchParams to avoid blocking form render
function EmailConfirmationHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const confirmed = searchParams.get('confirmed');
    if (confirmed === 'true') {
      toast.success("Email confirmed successfully! Please sign in to continue.");
      // Clean up URL by removing the query parameter
      router.replace('/signin');
    }
  }, [searchParams, router]);

  return null;
}

export function SignInPageClient() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  const form = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = React.useCallback(async (data: SignInFormData) => {
    if (!supabase) {
      toast.error(
        "Configuration error: Unable to connect to authentication service. Please check your configuration."
      );
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email.trim().toLowerCase(),
        password: data.password,
      });

      if (error) {
        // Provide more specific error messages
        const errorMessage = error.message?.toLowerCase() || "";
        if (errorMessage.includes("invalid login credentials") || errorMessage.includes("invalid credentials")) {
          toast.error("Invalid email or password. Please try again.");
        } else if (
          errorMessage.includes("failed to fetch") ||
          errorMessage.includes("network") ||
          errorMessage.includes("connection")
        ) {
          toast.error(
            "Unable to connect to authentication service. Please check your internet connection."
          );
        } else if (errorMessage.includes("email not confirmed")) {
          toast.error("Please confirm your email address before signing in.");
        } else {
          toast.error(error.message || "Failed to sign in. Please try again.");
        }
        setIsLoading(false);
        return;
      }

      toast.success("Signed in successfully!");

      // Clear any stale queries (like organization) that might have cached "null" while logged out.
      // This prevents the dashboard layout from hanging on "Redirecting..."
      queryClient.invalidateQueries();

      // Redirect to dashboard - let the dashboard layout handle the organization check
      router.push("/dashboard");
      router.refresh(); // Force server components to re-render with new session
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Sign in error:", error);
      }

      const message = error instanceof Error
        ? error.message
        : "An unexpected error occurred. Please try again.";

      toast.error(message);
      setIsLoading(false);
    }
  }, [supabase, router, queryClient]);

  const signInWithGoogle = React.useCallback(async () => {
    if (!supabase) {
      toast.error(
        "Configuration error: Unable to connect to authentication service."
      );
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }
      // OAuth redirect will happen automatically
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Failed to sign in with Google";
      toast.error(message);
      setIsLoading(false);
    }
  }, [supabase]);

  const [isChecked, setIsChecked] = useState(false);

  return (
    <PageTransition>
      <div className="flex flex-col flex-1 w-full">
        <Suspense fallback={null}>
          <EmailConfirmationHandler />
        </Suspense>
        <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto sm:pt-10">
          <div>
            <div className="mb-4 sm:mb-6">
              <h1 className="mb-1.5 text-xl font-semibold text-gray-800 dark:text-white/90 sm:text-2xl">
                Sign In
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
                Enter your email and password to sign in!
              </p>
            </div>
            <div>
              <AuthGoogleButton onClick={signInWithGoogle} isLoading={isLoading}>
                Sign in with Google
              </AuthGoogleButton>

              <div className="relative py-2.5 sm:py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-gray-800"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 py-1 text-gray-400 bg-white dark:bg-gray-900">
                    Or
                  </span>
                </div>
              </div>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-400 sm:text-sm">
                          Email <span className="text-error-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="info@gmail.com"
                            className="h-9 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-400 sm:text-sm">
                          Password <span className="text-error-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <PasswordInput
                              placeholder="Enter your password"
                              className="h-9 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 pr-10 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative w-5 h-5">
                        <input
                          type="checkbox"
                          id="remember"
                          checked={isChecked}
                          onChange={(e) => setIsChecked(e.target.checked)}
                          className="w-5 h-5 appearance-none cursor-pointer dark:border-gray-700 border border-gray-300 checked:border-transparent rounded-md checked:bg-brand-500"
                        />
                        {isChecked && (
                          <svg
                            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 14 14"
                            fill="none"
                          >
                            <path
                              d="M11.6666 3.5L5.24992 9.91667L2.33325 7"
                              stroke="white"
                              strokeWidth="1.94437"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                      <span className="block font-normal text-gray-700 text-theme-sm dark:text-gray-400">
                        Keep me logged in
                      </span>
                    </div>
                    <Link
                      href="/forgot-password"
                      className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <div>
                    <AuthPrimaryButton type="submit" isLoading={isLoading}>
                      Sign in
                    </AuthPrimaryButton>
                  </div>
                </form>
              </Form>

              <div className="mt-5">
                <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/signup"
                    className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
                  >
                    Sign Up
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}