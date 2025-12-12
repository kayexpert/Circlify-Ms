"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Loader2 } from "lucide-react";
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

  if (!isValidSession) {
    return (
      <Loader text="Verifying reset link..." size="lg" fullScreen />
    );
  }

  return (
    <Card className="border-2 shadow-xl">
      <CardHeader className="space-y-2 pb-6">
        <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
        <CardDescription className="text-base">Enter your new password</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">New Password</FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder="Enter new password"
                      className="h-11"
                      {...field}
                    />
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
                  <FormLabel className="text-sm font-medium">Confirm Password</FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder="Confirm new password"
                      className="h-11"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full h-11 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-semibold shadow-lg transition-all duration-200" 
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Password
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

