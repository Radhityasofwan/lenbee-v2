import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, ROLE_HOME } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Masuk" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(ROLE_HOME[user.role]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Masuk</h1>
      <LoginForm />
    </div>
  );
}
