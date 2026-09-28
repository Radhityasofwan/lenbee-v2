"use client";

import { useActionState, useState, useTransition } from "react";
import { Check, Copy, Loader2, Mail, Phone, Send, Trash2, UserPlus } from "lucide-react";
import { FcConferenceCall } from "react-icons/fc";
import { toast } from "sonner";
import { createParentInviteAction, revokeParentInviteAction } from "@/app/actions/parents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDateLong } from "@/lib/datetime";
import { idleState } from "@/lib/form";
import { useActionToast } from "@/lib/hooks/use-action-toast";
import { useOrigin } from "@/lib/hooks/use-origin";
import { whatsappHref } from "@/lib/whatsapp";

export type ParentContact = {
  parentUserId: number;
  relation: string;
  name: string;
  email: string;
  phone: string | null;
};

export type PendingInvite = {
  id: number;
  path: string;
  email: string;
  name: string;
  phone: string | null;
  expiresAt: string;
};

type Props = {
  studentId: number;
  studentName: string;
  parents: ParentContact[];
  invites: PendingInvite[];
  defaultName: string;
  defaultEmail: string;
  defaultPhone: string;
};

function mailtoHref(email: string, studentName: string, link: string) {
  const subject = `Undangan akun Lenbee untuk ${studentName}`;
  const body = `Halo,\n\nBerikut link untuk mengaktifkan akun Lenbee dan memantau perkembangan les ${studentName}:\n${link}\n\nLink berlaku 14 hari.`;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function inviteMessage(name: string, studentName: string, link: string) {
  return `Halo ${name}, ini link untuk mengaktifkan akun Lenbee agar bisa memantau perkembangan les ${studentName}:\n${link}\n\nLink berlaku 14 hari.`;
}

/** Tombol salin + WhatsApp + email untuk satu link undangan. */
function InviteShare({
  path,
  email,
  name,
  studentName,
  phone,
}: {
  path: string;
  email: string;
  name: string;
  studentName: string;
  phone: string | null;
}) {
  const origin = useOrigin();
  const [copied, setCopied] = useState(false);
  const link = `${origin}${path}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Link undangan disalin.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin otomatis. Salin link di atas secara manual.");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={copy}>
        {copied ? <Check /> : <Copy />}
        {copied ? "Tersalin" : "Salin link"}
      </Button>
      <Button asChild variant="outline" size="sm">
        <a
          href={whatsappHref(phone, inviteMessage(name, studentName, link))}
          target="_blank"
          rel="noreferrer"
        >
          <Send />
          WhatsApp
        </a>
      </Button>
      <Button asChild variant="outline" size="sm">
        <a href={mailtoHref(email, studentName, link)}>
          <Mail />
          Email
        </a>
      </Button>
    </div>
  );
}

function RevokeButton({ inviteId, studentId }: { inviteId: number; studentId: number }) {
  const [state, formAction] = useActionState(revokeParentInviteAction, idleState);
  const [pending, startTransition] = useTransition();
  useActionToast(state);

  // Tanpa <form> sendiri supaya tidak bersarang di dalam form dialog.
  const submit = () => {
    const data = new FormData();
    data.set("inviteId", String(inviteId));
    data.set("studentId", String(studentId));
    startTransition(() => formAction(data));
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={submit}
      disabled={pending}
      className="text-destructive"
    >
      {pending ? <Loader2 className="animate-spin" /> : <Trash2 />}
      Batalkan
    </Button>
  );
}

/** Isi dialog undangan: form, hasil link siap kirim, atau konfirmasi akses tersambung. */
function InviteDialog({
  studentId,
  studentName,
  defaultName,
  defaultEmail,
  defaultPhone,
  onClose,
}: {
  studentId: number;
  studentName: string;
  defaultName: string;
  defaultEmail: string;
  defaultPhone: string;
  onClose: () => void;
}) {
  const origin = useOrigin();
  const [state, formAction] = useActionState(createParentInviteAction, idleState);
  useActionToast(state);

  const path = state.ok && typeof state.data?.path === "string" ? state.data.path : null;
  const created = path
    ? {
        path,
        email: String(state.data?.email ?? ""),
        name: String(state.data?.name ?? ""),
        phone: String(state.data?.phone ?? ""),
      }
    : null;
  // Email sudah punya akun: akses tersambung langsung, tidak ada link untuk dibagikan.
  const linkedDirect = state.ok && created === null;

  if (created) {
    return (
      <div className="flex flex-col gap-4 pb-4">
        <FormAlert tone="success">
          Link undangan siap dikirim ke {created.email}. Link lama yang masih berlaku dipakai ulang.
        </FormAlert>

        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Link undangan</p>
          <p className="mt-1 text-xs font-medium break-all">{`${origin}${created.path}`}</p>
        </div>

        <InviteShare
          path={created.path}
          email={created.email}
          name={created.name}
          studentName={studentName}
          phone={created.phone || null}
        />

        <p className="text-xs text-muted-foreground">
          Bagikan link ini ke orang tua. Mereka mengisi nama, password, lalu otomatis masuk ke beranda orang tua.
        </p>

        <Button type="button" onClick={onClose}>
          Selesai
        </Button>
      </div>
    );
  }

  if (linkedDirect) {
    return (
      <div className="flex flex-col gap-4 pb-4">
        <FormAlert tone="success">
          Email ini sudah punya akun Lenbee. Akses ke {studentName} langsung tersambung.
        </FormAlert>

        <Button type="button" onClick={onClose}>
          Selesai
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4 pb-4">
      <input type="hidden" name="studentId" value={studentId} />

      {state.message && !state.ok ? <FormAlert tone="error">{state.message}</FormAlert> : null}

      <FieldGroup>
        <Field label="Nama orang tua" htmlFor="parentInviteName" error={state.fieldErrors?.name} required>
          <Input id="parentInviteName" name="name" defaultValue={defaultName} autoComplete="name" required />
        </Field>

        <Field
          label="Email"
          htmlFor="parentInviteEmail"
          hint="Email ini jadi username untuk masuk."
          error={state.fieldErrors?.email}
          required
        >
          <Input
            id="parentInviteEmail"
            name="email"
            type="email"
            inputMode="email"
            defaultValue={defaultEmail}
            autoComplete="email"
            required
          />
        </Field>

        <Field
          label="Nomor WhatsApp"
          htmlFor="parentInvitePhone"
          hint="Opsional, dipakai tombol kirim WhatsApp."
          error={state.fieldErrors?.phone}
        >
          <Input
            id="parentInvitePhone"
            name="phone"
            type="tel"
            inputMode="tel"
            defaultValue={defaultPhone}
            autoComplete="tel"
          />
        </Field>
      </FieldGroup>

      <SubmitButton pendingLabel="Membuat link…" className="w-full">
        Buat link undangan
      </SubmitButton>

      <p className="text-xs text-muted-foreground">
        Bila email ini sudah punya akun Lenbee, tidak ada link yang dibuat — akses ke {studentName} langsung tersambung.
      </p>
    </form>
  );
}

export function ParentAccessSection({
  studentId,
  studentName,
  parents,
  invites,
  defaultName,
  defaultEmail,
  defaultPhone,
}: Props) {
  // Nomor sesi dialog: tiap kali dibuka, isi dialog dirender ulang dari kondisi bersih.
  const [session, setSession] = useState<number | null>(null);

  const knownParent = parents.length > 0;
  const waiting = invites.length > 0;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FcConferenceCall className="size-4" />
          Akses orang tua
        </CardTitle>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => setSession((current) => (current ?? 0) + 1)}
        >
          <UserPlus className="size-3.5" />
          Undang
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5">
        {knownParent
          ? parents.map((parent) => (
              <div key={parent.parentUserId} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{parent.name}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Mail className="size-3" />
                      {parent.email}
                    </span>
                    {parent.phone ? (
                      <span className="flex items-center gap-1">
                        <Phone className="size-3" />
                        {parent.phone}
                      </span>
                    ) : null}
                  </p>
                </div>
                <Badge variant="success" className="shrink-0 text-[10px]">
                  {parent.relation || "Terhubung"}
                </Badge>
              </div>
            ))
          : null}

        {invites.map((invite) => (
          <div key={invite.id} className="flex flex-col gap-2.5 rounded-lg border border-dashed border-border p-2.5">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{invite.name}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{invite.email}</p>
              </div>
              <Badge variant="warning" className="shrink-0 text-[10px]">
                Menunggu aktivasi
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Link berlaku sampai {formatDateLong(invite.expiresAt.slice(0, 10))}.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <InviteShare
                path={invite.path}
                email={invite.email}
                name={invite.name}
                studentName={studentName}
                phone={invite.phone}
              />
              <RevokeButton inviteId={invite.id} studentId={studentId} />
            </div>
          </div>
        ))}

        {!knownParent && !waiting ? (
          <p className="px-1 py-2 text-xs text-muted-foreground">
            Belum ada akun orang tua yang tersambung. Undang lewat email orang tua, lalu kirim linknya via WhatsApp atau
            email. Orang tua membuat password sendiri dan langsung bisa melihat jadwal, laporan, serta invoice.
          </p>
        ) : null}
      </CardContent>

      <Dialog
        open={session !== null}
        onOpenChange={(next) => {
          if (!next) setSession(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Undang orang tua</DialogTitle>
            <DialogDescription>
              Buat link aktivasi akun orang tua untuk {studentName}. Link bisa langsung dikirim lewat WhatsApp atau email.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {session === null ? null : (
              <InviteDialog
                key={session}
                studentId={studentId}
                studentName={studentName}
                defaultName={defaultName}
                defaultEmail={defaultEmail}
                defaultPhone={defaultPhone}
                onClose={() => setSession(null)}
              />
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
