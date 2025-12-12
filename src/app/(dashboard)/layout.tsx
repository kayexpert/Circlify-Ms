"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/types/database";
import { Loader } from "@/components/ui/loader";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useOrganization } from "@/hooks/use-organization";
import { PageLoadingProvider, usePageLoading } from "@/contexts/page-loading-context";

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasOrganization, setHasOrganization] = useState(false);
  const [showLoader, setShowLoader] = useState(true);
  const router = useRouter();
  const supabase = createClient();
  const { organization, isLoading: orgLoading } = useOrganization();
  const { isPageLoading } = usePageLoading();
  
  // Determine if we should show loader
  const shouldShowLoader = isLoading || orgLoading || isPageLoading;
  
  // Handle smooth loader transition with fade-out
  useEffect(() => {
    if (shouldShowLoader) {
      setShowLoader(true);
    } else {
      // Delay hiding to allow fade-out animation (300ms matches CSS transition)
      const timer = setTimeout(() => {
        setShowLoader(false);
      }, 350); // Slightly longer than transition to ensure smooth fade
      return () => clearTimeout(timer);
    }
  }, [shouldShowLoader]);

  useEffect(() => {
    let mounted = true;
    async function loadUserAndCheckOrganization() {
      try {
        // Step 1: Check authentication
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser();
        
        if (!mounted) return;
        
        if (authError || !authUser) {
          router.replace("/signin");
          return;
        }

        // Step 2: Get user data
        const { data: userData } = await supabase
          .from("users")
          .select("id, email, full_name, avatar_url, created_at, updated_at")
          .eq("id", authUser.id)
          .single();
        
        if (!mounted) return;
        
        if (userData) {
          setUser(userData);
        }
        
        // Step 3: Check if user has any organization_users link
        const { data: orgLink, error: orgLinkError } = await supabase
          .from("organization_users")
          .select("id")
          .eq("user_id", authUser.id)
          .limit(1);
        
        if (!mounted) return;
        
        if (orgLinkError || !orgLink || orgLink.length === 0) {
          // User has no organization - redirect to onboarding
          router.replace("/setup-organization");
          return;
        }

        // Step 4: Check if user has an active session with organization
        // This ensures they have completed onboarding and have an active organization
        const { data: session, error: sessionError } = await supabase
          .from("user_sessions")
          .select("organization_id")
          .eq("user_id", authUser.id)
          .maybeSingle();
        
        if (!mounted) return;
        
        if (sessionError || !session || !session.organization_id) {
          // User has organization_users link but no active session
          // This means they haven't completed onboarding or session wasn't created
          router.replace("/setup-organization");
          return;
        }

        // All checks passed - user has an organization
        setHasOrganization(true);
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Error in dashboard layout:", error);
        }
        // On error, redirect to signin for safety
        if (mounted) {
          router.replace("/signin");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }
    
    loadUserAndCheckOrganization();
    
    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  // Show loader with smooth transitions
  // Keep loader mounted during fade-out transition
  if (showLoader || shouldShowLoader) {
    return <Loader text="Loading dashboard..." size="lg" fullScreen />;
  }

  // Don't render dashboard if user doesn't have organization
  // This prevents any components from loading before redirect
  if (!user || !hasOrganization || !organization) {
    return <Loader text="Redirecting..." size="lg" fullScreen />;
  }

  // Only render dashboard if all checks passed
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden bg-background min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto bg-background p-6 min-h-0 overscroll-contain">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageLoadingProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </PageLoadingProvider>
  );
}
