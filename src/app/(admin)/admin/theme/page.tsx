import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { getThemeConfig } from "@/lib/services/settings";
import { ThemeForm } from "./theme-form";

export const metadata: Metadata = { title: "Tema" };

export default async function AdminThemePage() {
  const config = await getThemeConfig();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Tema"
        description="Atur warna brand aplikasi — primary, gradasi, dan turunannya (aksen, fokus). Berlaku untuk semua akun."
      />
      <ThemeForm initialConfig={config} />
    </div>
  );
}
