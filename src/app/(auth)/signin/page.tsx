import type { Metadata } from "next"
import { SignInPageClient } from "./signin-page-client"

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your account to access your organization's dashboard",
}

import { Suspense } from "react"
import { AuthFormSkeletonDetailed } from "@/components/auth/auth-form-skeleton"

export default function SignInPage() {
  return (
    <Suspense fallback={<AuthFormSkeletonDetailed />}>
      <SignInPageClient />
    </Suspense>
  )
}
