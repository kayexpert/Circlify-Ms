"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/types/database";
import { Loader } from "@/components/ui/loader";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;
    async function loadUser() {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (!mounted) return;
        if (!authUser) {
          router.push("/signin");
          return;
        }
        const { data: userData } = await supabase
          .from("users")
          .select("id, email, full_name, avatar_url, created_at, updated_at")
          .eq("id", authUser.id)
          .single();
        
        if (userData) {
          setUser(userData);
        }
        
        const { data: orgLink } = await supabase
          .from("organization_users")
          .select("id")
          .eq("user_id", authUser.id)
          .limit(1);
        if (!orgLink || orgLink.length === 0) {
          router.push("/setup-organization");
          return;
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadUser();
    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  if (isLoading) {
    return <Loader text="Loading dashboard..." size="lg" fullScreen />;
  }

  if (!user) return null;

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
