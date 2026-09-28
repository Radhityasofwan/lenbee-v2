import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Daftar" };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "parent" ? "/parent" : "/home");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Daftar akun pengajar</CardTitle>
        <CardDescription>
          Akun ini untuk pengajar/tutor. Undangan orang tua dibuat dari dalam aplikasi.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
      </CardContent>
    </Card>
  );
}
