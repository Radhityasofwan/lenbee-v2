"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormAlert } from "@/components/ui/form-alert";
import { idleState } from "@/lib/form";
import { registerAction } from "@/app/actions/auth";

export function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, idleState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.message && !state.ok ? <FormAlert tone="error">{state.message}</FormAlert> : null}

      <FieldGroup>
        <Field label="Nama lengkap" htmlFor="name" error={errors.name} required>
          <Input id="name" name="name" autoComplete="name" placeholder="Nama Anda" required />
        </Field>

        <Field label="Email" htmlFor="email" error={errors.email} required>
          <Input id="email" name="email" type="email" inputMode="email" autoComplete="email" placeholder="nama@email.com" required />
        </Field>

        <Field label="Nomor WhatsApp" htmlFor="phone" hint="Opsional, dipakai untuk kontak orang tua." error={errors.phone}>
          <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="08xxxxxxxxxx" />
        </Field>

        <Field label="Password" htmlFor="password" hint="Minimal 8 karakter." error={errors.password} required>
          <Input id="password" name="password" type="password" autoComplete="new-password" required />
        </Field>

        <Field label="Ulangi password" htmlFor="confirmPassword" error={errors.confirmPassword} required>
          <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
        </Field>
      </FieldGroup>

      <SubmitButton pendingLabel="Membuat akun…" className="w-full">
        Daftar
      </SubmitButton>

      <p className="text-center text-sm text-muted-foreground">
        Sudah punya akun?{" "}
        <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
          Masuk
        </Link>
      </p>
    </form>
  );
}
