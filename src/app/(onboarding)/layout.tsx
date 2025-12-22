import { APP_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AuthProvider } from "@/contexts/auth-context";
import { AuthSideContent } from "@/components/auth/auth-side-content";
import ThemeTogglerTwo from "@/components/auth/ThemeTogglerTwo";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  return (
    <AuthProvider>
      <div className="relative flex w-full h-screen overflow-hidden bg-white dark:bg-gray-900">
        {/* Left column - Form */}
        <div className="w-full lg:w-1/2 h-full overflow-y-auto no-scrollbar relative z-10 flex flex-col justify-center">
          {children}
        </div>

        {/* Right column - Side Content */}
        <div className="hidden lg:flex lg:w-1/2 h-full bg-brand-950 dark:bg-gray-950 items-center justify-center relative fixed right-0 top-0">
          <div className="relative z-10 w-full h-full">
            <AuthSideContent />
          </div>
        </div>

        {/* Sign Out Button (Absolute) */}
        <div className="absolute top-4 right-4 z-50">
          <form action="/api/auth/signout" method="post">
            <Button variant="outline" size="sm" type="submit" className="bg-transparent text-white border-white hover:bg-white/10 hover:text-white backdrop-blur-sm">
              Sign Out
            </Button>
          </form>
        </div>

        {/* Theme Toggler (Absolute Bottom Right) */}
        <div className="absolute bottom-4 right-4 z-50 hidden lg:block">
          <ThemeTogglerTwo />
        </div>
      </div>
    </AuthProvider>
  );
}

