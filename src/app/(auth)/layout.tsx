"use client";

import GridShape from "@/components/auth/GridShape";
import ThemeTogglerTwo from "@/components/auth/ThemeTogglerTwo";
import { AuthSideContent } from "@/components/auth/auth-side-content";
import Image from "next/image";
import Link from "next/link";
import React from "react";

import { AuthProvider } from "@/contexts/auth-context";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="relative flex w-full h-screen overflow-hidden bg-white dark:bg-gray-900">
        {/* Left column - Form */}
        <div className="w-full lg:w-1/2 h-full overflow-y-auto no-scrollbar relative z-10 flex flex-col justify-center">
          {children}
        </div>

        {/* Right column - Testimonials/Branding */}
        <div className="hidden lg:flex lg:w-1/2 h-full bg-brand-950 dark:bg-gray-950 items-center justify-center relative fixed right-0 top-0">
          <div className="absolute inset-0 z-0">
            {/* Common Grid Shape */}
            <GridShape />
          </div>
          <div className="relative z-10 w-full h-full">
            <AuthSideContent />
          </div>
        </div>

        {/* Theme Toggler */}
        <div className="fixed bottom-6 right-6 z-50">
          <ThemeTogglerTwo />
        </div>
      </div>
    </AuthProvider>
  );
}


