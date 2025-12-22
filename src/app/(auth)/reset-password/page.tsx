import type { Metadata } from "next"
import { Suspense } from "react"
import { ResetPasswordPageClient } from "./reset-password-page-client"
import { AuthFormSkeletonDetailed } from "@/components/auth/auth-form-skeleton"

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Set a new password for your account",
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthFormSkeletonDetailed />}>
      <ResetPasswordPageClient />
    </Suspense>
  )
}
