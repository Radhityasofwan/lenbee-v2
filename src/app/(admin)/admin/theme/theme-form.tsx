"use client";

import { useActionState, useState } from "react";
import { updateThemeColorAction } from "@/app/actions/theme";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { deriveThemeTokens, isValidHex } from "@/lib/domain/theme";
import { idleState } from "@/lib/form";
import { useActionToast } from "@/lib/hooks/use-action-toast";

const FALLBACK_COLOR = "#7c5cd6";

export function ThemeForm({ initialColor }: { initialColor: string | null }) {
  const [state, action] = useActionState(updateThemeColorAction, idleState);
  const [color, setColor] = useState(initialColor ?? FALLBACK_COLOR);

  useActionToast(state);

  const valid = isValidHex(color);
  const tokens = valid ? deriveThemeTokens(color) : null;

  return (
    <form action={action} className="flex flex-col gap-4">
      {state.message && !state.ok ? <FormAlert tone="error">{state.message}</FormAlert> : null}

      <FieldGroup>
        <Field label="Warna primary" htmlFor="theme-color-picker" error={state.fieldErrors?.color}>
          <div className="flex items-center gap-2">
            <input
              id="theme-color-picker"
              type="color"
              value={valid ? color : FALLBACK_COLOR}
              onChange={(event) => setColor(event.target.value)}
              className="size-10 shrink-0 cursor-pointer rounded-lg border border-input bg-transparent p-1"
            />
            <Input
              name="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              placeholder="#7c5cd6"
              maxLength={7}
              className="font-mono"
            />
          </div>
        </Field>
      </FieldGroup>

      {tokens ? (
        <div className="flex flex-col gap-2 rounded-2xl border border-border p-4">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Pratinjau</p>
          <div className="flex flex-wrap gap-2">
            <span
              className="rounded-lg px-3 py-2 text-sm font-semibold"
              style={{ background: tokens.light.primary, color: tokens.light.primaryForeground }}
            >
              Mode terang
            </span>
            <span
              className="rounded-lg px-3 py-2 text-sm font-semibold"
              style={{ background: tokens.dark.primary, color: tokens.dark.primaryForeground }}
            >
              Mode gelap
            </span>
          </div>
        </div>
      ) : color === "" ? (
        <p className="text-xs text-muted-foreground">Kosong — memakai warna bawaan aplikasi.</p>
      ) : (
        <p className="text-xs text-destructive">Format warna harus hex 6 digit, mis. #7c5cd6.</p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => setColor("")}>
          Kembalikan ke bawaan
        </Button>
        <SubmitButton pendingLabel="Menyimpan…" disabled={!valid && color !== ""}>
          Simpan
        </SubmitButton>
      </div>
    </form>
  );
}
