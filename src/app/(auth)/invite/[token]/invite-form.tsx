"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormAlert } from "@/components/ui/form-alert";
import { idleState } from "@/lib/form";
import { acceptInviteAction } from "@/app/actions/auth";

export function InviteForm({ token, defaultName, defaultPhone }: { token: string; defaultName: string; defaultPhone: string }) {
  const [state, formAction] = useActionState(acceptInviteAction, idleState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="token" value={token} />

      {state.message && !state.ok ? <FormAlert tone="error">{state.message}</FormAlert> : null}

      <FieldGroup>
        <Field label="Nama lengkap" htmlFor="name" error={errors.name} required>
          <Input id="name" name="name" defaultValue={defaultName} autoComplete="name" required />
        </Field>

        <Field label="Nomor WhatsApp" htmlFor="phone" error={errors.phone}>
          <Input id="phone" name="phone" type="tel" inputMode="tel" defaultValue={defaultPhone} autoComplete="tel" />
        </Field>

        <Field label="Password" htmlFor="password" hint="Minimal 8 karakter." error={errors.password} required>
          <Input id="password" name="password" type="password" autoComplete="new-password" required />
        </Field>

        <Field label="Ulangi password" htmlFor="confirmPassword" error={errors.confirmPassword} required>
          <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
        </Field>
      </FieldGroup>

      <SubmitButton pendingLabel="Mengaktifkan akun…" className="w-full">
        Aktifkan akun
      </SubmitButton>

      <p className="text-center text-sm text-muted-foreground">
        Sudah pernah mengaktifkan?{" "}
        <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
          Masuk
        </Link>
      </p>
    </form>
  );
}
