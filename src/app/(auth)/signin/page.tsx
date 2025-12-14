import type { Metadata } from "next"
import { Suspense } from "react"
import { SignInPageClient } from "./signin-page-client"

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your account to access your organization's dashboard",
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInPageClient />
    </Suspense>
  )
}
