"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Loader2, ChevronLeft } from "lucide-react";

const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type SignInFormData = z.infer<typeof signInSchema>;

export function SignInPageClient() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Check for email confirmation success message
  useEffect(() => {
    const confirmed = searchParams.get('confirmed');
    if (confirmed === 'true') {
      toast.success("Email confirmed successfully! Please sign in to continue.");
      // Clean up URL by removing the query parameter
      router.replace('/signin');
    }
  }, [searchParams, router]);
  
  // Memoize Supabase client creation
  const supabase = React.useMemo(() => {
    try {
      return createClient();
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to create Supabase client:", error);
      }
      return null;
    }
  }, []);

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

      // Redirect to dashboard - let the dashboard layout handle the organization check
      router.push("/dashboard");
      router.refresh();
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
  }, [supabase, router]);

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
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
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
            <button 
              onClick={signInWithGoogle}
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center gap-3 py-2.5 text-sm font-normal text-gray-700 transition-colors bg-gray-100 rounded-lg px-6 hover:bg-gray-200 hover:text-gray-800 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10"
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
              Sign in with Google
            </button>
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
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full inline-flex items-center justify-center font-medium gap-2 rounded-lg transition px-4 py-2.5 text-sm bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Sign in
                  </button>
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
  );
}