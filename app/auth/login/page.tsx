import LoginForm from "@/components/auth/LoginForm";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login - Rendezvous",
  description: "Login to your account at Rendezvous",
};

export default async function LoginPage() {
  const session = await getSession();

  // Redirects user to homepage if already logged in
  if (session) {
    redirect("/");
  }

  return <LoginForm />;
}
