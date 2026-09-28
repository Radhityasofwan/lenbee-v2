import type { Metadata } from "next";
import { PanduanGuide } from "@/components/guide/panduan-guide";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Panduan" };

export default function PanduanPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Panduan"
        description="Alur setup Lenbee dari nol sampai siap dipakai sehari-hari."
      />
      <PanduanGuide />
    </div>
  );
}
