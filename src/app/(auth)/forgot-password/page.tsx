"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createClient } from "@/lib/supabase/client";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  
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

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = React.useCallback(async (data: ForgotPasswordFormData) => {
    if (!supabase) {
      toast.error(
        "Configuration error: Unable to connect to authentication service. Please check your configuration."
      );
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        data.email.trim().toLowerCase(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (error) {
        const errorMessage = error.message?.toLowerCase() || "";
        if (errorMessage.includes("user not found")) {
          // Don't reveal if email exists for security
          setEmailSent(true);
          return;
        }
        throw error;
      }

      setEmailSent(true);
      toast.success("Password reset email sent! Please check your inbox.");
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Password reset error:", error);
      }
      
      const message = error instanceof Error 
        ? error.message 
        : "Failed to send reset email. Please try again.";
      
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  if (emailSent) {
    return (
      <div className="flex flex-col flex-1 lg:w-1/2 w-full">
        <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto sm:pt-10">
          <div>
            <div className="mb-4 sm:mb-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-brand-500 mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="mb-1.5 text-xl font-semibold text-gray-800 dark:text-white/90 sm:text-2xl text-center">
                Check Your Email
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 sm:text-sm text-center">
                We&apos;ve sent you a password reset link
              </p>
            </div>
            <div className="space-y-4">
              <p className="text-xs text-center text-gray-600 dark:text-gray-400 sm:text-sm">
                Please check your email inbox and click the password reset link to
                create a new password.
              </p>
              <Link href="/signin" className="block">
                <button
                  type="button"
                  className="w-full inline-flex items-center justify-center font-medium gap-2 rounded-lg transition px-4 py-2.5 text-sm bg-transparent border border-gray-300 text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Sign In
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto sm:pt-10">
        <div>
          <div className="mb-4 sm:mb-6">
            <h1 className="mb-1.5 text-xl font-semibold text-gray-800 dark:text-white/90 sm:text-2xl">
              Forgot Password
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
              Enter your email to receive a password reset link
            </p>
          </div>
          <div>
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
                          placeholder="Enter your email"
                          className="h-9 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full inline-flex items-center justify-center font-medium gap-2 rounded-lg transition px-4 py-2.5 text-sm bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Send Reset Link
                  </button>
                </div>
              </form>
            </Form>

            <div className="mt-5">
              <Link
                href="/signin"
                className="text-xs text-brand-500 hover:text-brand-600 dark:text-brand-400 sm:text-sm inline-flex items-center"
              >
                <ArrowLeft className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

