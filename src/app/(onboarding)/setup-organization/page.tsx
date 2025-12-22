import { Suspense } from "react";
import { SetupOrganizationPageClient } from "./setup-organization-page-client";
import { AuthFormSkeletonOnboarding } from "@/components/auth/auth-form-skeleton";

export default function SetupOrganizationPage() {
  return (
    <Suspense fallback={<AuthFormSkeletonOnboarding />}>
      <SetupOrganizationPageClient />
    </Suspense>
  );
}
