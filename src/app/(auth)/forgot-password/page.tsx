import type { Metadata } from "next"
import { Suspense } from "react"
import { ForgotPasswordPageClient } from "./forgot-password-page-client"
import { AuthFormSkeletonDetailed } from "@/components/auth/auth-form-skeleton"

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset your password",
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<AuthFormSkeletonDetailed />}>
      <ForgotPasswordPageClient />
    </Suspense>
  )
}
