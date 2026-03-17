import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Authentication - Finance Dashboard",
  description: "Sign in or sign up to access your finance dashboard",
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
