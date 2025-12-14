"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { PasswordInput } from "@/components/ui/password-input";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import { Loader } from "@/components/ui/loader";

const resetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const router = useRouter();
  
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

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Check if user has a valid session for password reset
  useEffect(() => {
    const checkSession = async () => {
      if (!supabase) return;
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast.error("Invalid or expired reset link. Please request a new one.");
          router.push("/forgot-password");
        } else {
          setIsValidSession(true);
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Session check error:", error);
        }
        toast.error("Unable to verify reset link. Please request a new one.");
        router.push("/forgot-password");
      }
    };

    checkSession();
  }, [supabase, router]);

  const onSubmit = React.useCallback(async (data: ResetPasswordFormData) => {
    if (!supabase) {
      toast.error(
        "Configuration error: Unable to connect to authentication service. Please check your configuration."
      );
      return;
    }

    if (!isValidSession) {
      toast.error("Invalid or expired reset link. Please request a new one.");
      router.push("/forgot-password");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        const errorMessage = error.message?.toLowerCase() || "";
        if (errorMessage.includes("password")) {
          toast.error("Password does not meet requirements. Please use a stronger password.");
        } else {
          toast.error(error.message || "Failed to update password. Please try again.");
        }
        setIsLoading(false);
        return;
      }

      toast.success("Password updated successfully! Redirecting to sign in...");
      
      // Wait a moment before redirecting to show success message
      setTimeout(() => {
        router.push("/signin");
      }, 1500);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Password update error:", error);
      }
      
      const message = error instanceof Error 
        ? error.message 
        : "An unexpected error occurred. Please try again.";
      
      toast.error(message);
      setIsLoading(false);
    }
  }, [supabase, router, isValidSession]);

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto sm:pt-10">
        <div>
          <div className="mb-4 sm:mb-6">
            <h1 className="mb-1.5 text-xl font-semibold text-gray-800 dark:text-white/90 sm:text-2xl">
              Reset Password
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
              Enter your new password
            </p>
          </div>
          <div>
            {!isValidSession && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying reset link...
                </p>
              </div>
            )}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate style={{ opacity: !isValidSession ? 0.5 : 1, pointerEvents: !isValidSession ? 'none' : 'auto' }}>
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-400 sm:text-sm">
                        New Password <span className="text-error-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <PasswordInput
                            placeholder="Enter new password"
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
                        Confirm Password <span className="text-error-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <PasswordInput
                            placeholder="Confirm new password"
                            className="h-9 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 pr-10 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                            {...field}
                          />
                        </div>
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
                    Update Password
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

