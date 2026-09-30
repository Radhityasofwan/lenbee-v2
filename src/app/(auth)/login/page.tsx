import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, ROLE_HOME } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Masuk" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(ROLE_HOME[user.role]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-lg font-bold tracking-tight text-foreground">Masuk ke akun Anda</h1>
        <p className="mt-1 text-sm text-muted-foreground">Senang bertemu lagi — silakan lanjutkan belajar.</p>
      </div>
      <LoginForm />
    </div>
  );
}
