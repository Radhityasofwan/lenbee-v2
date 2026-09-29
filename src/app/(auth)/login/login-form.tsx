"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormAlert } from "@/components/ui/form-alert";
import { idleState } from "@/lib/form";
import { loginAction } from "@/app/actions/auth";

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, idleState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.message && !state.ok ? <FormAlert tone="error">{state.message}</FormAlert> : null}

      <FieldGroup>
        <Field label="Email" htmlFor="email" error={errors.email}>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="nama@email.com"
            required
          />
        </Field>

        <Field label="Password" htmlFor="password" error={errors.password}>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
      </FieldGroup>

      <SubmitButton pendingLabel="Sedang masuk…" className="w-full">
        Masuk
      </SubmitButton>
    </form>
  );
}
