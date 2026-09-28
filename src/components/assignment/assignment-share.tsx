"use client";

import { Copy, MessageCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useOrigin } from "@/lib/hooks/use-origin";
import { whatsappHref } from "@/lib/whatsapp";

export function AssignmentShare({
  token,
  title,
  studentLabel,
  parentPhone,
}: {
  token: string;
  title: string;
  studentLabel: string;
  parentPhone: string | null;
}) {
  const origin = useOrigin();
  const link = origin ? `${origin}/share/assignment/${token}` : "";
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Link tugas disalin.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin link.");
    }
  }

  const message = `Halo, ini link tugas "${title}" untuk ${studentLabel}:\n${link}\n\nBisa dikerjakan langsung dari HP.`;

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" className="h-9 text-xs" onClick={copyLink} disabled={!link}>
        <Copy />
        {copied ? "Tersalin" : "Salin link tugas"}
      </Button>
      <Button asChild variant="outline" size="sm" className="h-9 text-xs">
        <a href={whatsappHref(parentPhone, message)} target="_blank" rel="noreferrer">
          <MessageCircle />
          Kirim WhatsApp
        </a>
      </Button>
    </div>
  );
}
