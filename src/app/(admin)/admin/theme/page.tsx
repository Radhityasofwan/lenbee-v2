import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { getThemeColor } from "@/lib/services/settings";
import { ThemeForm } from "./theme-form";

export const metadata: Metadata = { title: "Tema" };

export default async function AdminThemePage() {
  const color = await getThemeColor();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Tema" description="Atur warna utama (primary) aplikasi. Berlaku untuk semua akun." />
      <ThemeForm initialColor={color} />
    </div>
  );
}
