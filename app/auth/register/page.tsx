import RegisterForm from "@/components/auth/RegisterForm";
import { getSession } from "@/lib/session";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Register - Rendezvous",
  description: "Create a new account at Rendezvous",
};

export default async function RegisterPage() {
  const session = await getSession();

  // Redirects user to homepage if already logged in
  if (session) {
    redirect("/");
  }

  return <RegisterForm />;
}
