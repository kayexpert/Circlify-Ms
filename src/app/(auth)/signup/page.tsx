import type { Metadata } from "next"
import { SignUpPageClient } from "./signup-page-client"

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Create a new account to start managing your organization",
}

import { Suspense } from "react"
import { AuthFormSkeletonDetailed } from "@/components/auth/auth-form-skeleton"

export default function SignUpPage() {
  return (
    <Suspense fallback={<AuthFormSkeletonDetailed />}>
      <SignUpPageClient />
    </Suspense>
  )
}
