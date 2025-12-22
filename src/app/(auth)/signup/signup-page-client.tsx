"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
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

const signUpSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignUpFormData = z.infer<typeof signUpSchema>;

export function SignUpPageClient() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = useSupabase();

  const form = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = React.useCallback(async (data: SignUpFormData) => {
    if (!supabase) {
      toast.error(
        "Configuration error: Unable to connect to authentication service. Please check your configuration."
      );
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email: data.email.trim().toLowerCase(),
        password: data.password,
        options: {
          data: {
            full_name: data.full_name.trim(),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?type=signup`,
        },
      });

      if (error) {
        const errorMessage = error.message?.toLowerCase() || "";
        if (errorMessage.includes("user already registered")) {
          toast.error("An account with this email already exists. Please sign in instead.");
        } else if (errorMessage.includes("password")) {
          toast.error("Password does not meet requirements. Please use a stronger password.");
        } else {
          toast.error(error.message || "Failed to create account. Please try again.");
        }
        setIsLoading(false);
        return;
      }

      // Redirect to check email page
      router.push(`/signup/check-email?email=${encodeURIComponent(data.email.trim().toLowerCase())}`);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Sign up error:", error);
      }

      const message = error instanceof Error
        ? error.message
        : "An unexpected error occurred. Please try again.";

      toast.error(message);
      setIsLoading(false);
    }
  }, [supabase, router]);

  const signUpWithGoogle = React.useCallback(async () => {
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
        : "Failed to sign up with Google";
      toast.error(message);
      setIsLoading(false);
    }
  }, [supabase]);

  const [isChecked, setIsChecked] = useState(false);

  return (
    <PageTransition>
      <div className="flex flex-col flex-1 w-full overflow-y-auto no-scrollbar">
        <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto sm:pt-10">
          <div>
            <div className="mb-4 sm:mb-6">
              <h1 className="mb-1.5 text-xl font-semibold text-gray-800 dark:text-white/90 sm:text-2xl">
                Sign Up
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
                Enter your email and password to sign up!
              </p>
            </div>
            <div>
              <AuthGoogleButton onClick={signUpWithGoogle} isLoading={isLoading}>
                Sign up with Google
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
                    name="full_name"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-1">
                        <FormLabel className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-400 sm:text-sm">
                          Full Name<span className="text-error-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="Enter your full name"
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
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-400 sm:text-sm">
                          Email<span className="text-error-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="Enter your email"
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
                          Password<span className="text-error-500">*</span>
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

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-400 sm:text-sm">
                          Confirm Password<span className="text-error-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <PasswordInput
                              placeholder="Confirm your password"
                              className="h-9 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 pr-10 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-start gap-2.5">
                    <div className="relative w-4 h-4 mt-0.5">
                      <input
                        type="checkbox"
                        id="terms"
                        checked={isChecked}
                        onChange={(e) => setIsChecked(e.target.checked)}
                        className="w-4 h-4 appearance-none cursor-pointer dark:border-gray-700 border border-gray-300 checked:border-transparent rounded-md checked:bg-brand-500"
                      />
                      {isChecked && (
                        <svg
                          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                          xmlns="http://www.w3.org/2000/svg"
                          width="12"
                          height="12"
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
                    <p className="inline-block text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
                      By creating an account means you agree to the{" "}
                      <span className="text-gray-800 dark:text-white/90">
                        Terms and Conditions,
                      </span>{" "}
                      and our{" "}
                      <span className="text-gray-800 dark:text-white">
                        Privacy Policy
                      </span>
                    </p>
                  </div>

                  <div>
                    <AuthPrimaryButton type="submit" isLoading={isLoading}>
                      Sign Up
                    </AuthPrimaryButton>
                  </div>
                </form>
              </Form>

              <div className="mt-5">
                <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
                  Already have an account?{" "}
                  <Link
                    href="/signin"
                    className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
                  >
                    Sign In
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
