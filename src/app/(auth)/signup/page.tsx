import type { Metadata } from "next"
import { SignUpPageClient } from "./signup-page-client"

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Create a new account to start managing your organization",
}

export default function SignUpPage() {
  return <SignUpPageClient />
}
