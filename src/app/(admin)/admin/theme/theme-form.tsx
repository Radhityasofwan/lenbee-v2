"use client";

import { Shuffle } from "lucide-react";
import { useActionState, useState } from "react";
import { updateThemeColorAction } from "@/app/actions/theme";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Switch } from "@/components/ui/switch";
import { deriveThemeTokens, isValidHex, suggestGradientPartner, type ThemeConfig } from "@/lib/domain/theme";
import { idleState } from "@/lib/form";
import { useActionToast } from "@/lib/hooks/use-action-toast";

const FALLBACK_COLOR = "#7c5cd6";

function ColorField({
  id,
  label,
  hint,
  value,
  onChange,
  error,
  fallback,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  fallback: string;
}) {
  const valid = value === "" || isValidHex(value);
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error ?? (!valid ? "Format warna harus hex 6 digit, mis. #7c5cd6." : undefined)}>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          value={valid && value !== "" ? value : fallback}
          onChange={(event) => onChange(event.target.value)}
          className="size-10 shrink-0 cursor-pointer rounded-lg border border-input bg-transparent p-1"
        />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={fallback}
          maxLength={7}
          className="font-mono"
        />
      </div>
    </Field>
  );
}

export function ThemeForm({ initialConfig }: { initialConfig: ThemeConfig | null }) {
  const [state, action] = useActionState(updateThemeColorAction, idleState);
  const [primary, setPrimary] = useState(initialConfig?.primary ?? FALLBACK_COLOR);
  const [gradient, setGradient] = useState(initialConfig?.gradient ?? false);
  const [secondary, setSecondary] = useState(initialConfig?.secondary ?? "");

  useActionToast(state);

  const primaryValid = primary !== "" && isValidHex(primary);
  const secondaryValid = secondary === "" || isValidHex(secondary);
  const config: ThemeConfig | null = primaryValid
    ? { primary, gradient, secondary: secondaryValid && secondary !== "" ? secondary : null }
    : null;
  const tokens = config ? deriveThemeTokens(config) : null;
  const canSubmit = (primaryValid || primary === "") && secondaryValid;

  function toggleGradient(checked: boolean) {
    setGradient(checked);
    if (checked && secondary === "" && primaryValid) setSecondary(suggestGradientPartner(primary));
  }

  function randomizeSecondary() {
    if (primaryValid) setSecondary(suggestGradientPartner(primary));
  }

  function resetToDefault() {
    setPrimary("");
    setGradient(false);
    setSecondary("");
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      {state.message && !state.ok ? <FormAlert tone="error">{state.message}</FormAlert> : null}

      <input type="hidden" name="gradient" value={gradient ? "on" : ""} />
      <input type="hidden" name="secondary" value={gradient ? secondary : ""} />

      <div className="flex flex-col gap-4 rounded-2xl border border-border p-4">
        <FieldGroup>
          <input type="hidden" name="primary" value={primary} />
          <ColorField
            id="theme-primary"
            label="Warna primary"
            hint="Dasar seluruh turunan warna brand — tombol, fokus, aksen, dan gradasi."
            value={primary}
            onChange={setPrimary}
            error={state.fieldErrors?.primary}
            fallback={FALLBACK_COLOR}
          />
        </FieldGroup>

        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <div>
            <p className="text-sm font-medium">Gradasi</p>
            <p className="text-xs text-muted-foreground">Pakai 2 warna untuk logo &amp; tombol utama, bukan warna polos.</p>
          </div>
          <Switch checked={gradient} onCheckedChange={toggleGradient} disabled={!primaryValid} />
        </div>

        {gradient ? (
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <ColorField
                id="theme-secondary"
                label="Warna kedua"
                hint="Ujung gradasi. Kosongkan untuk diturunkan otomatis dari warna primary."
                value={secondary}
                onChange={setSecondary}
                error={state.fieldErrors?.secondary}
                fallback={primaryValid ? suggestGradientPartner(primary) : FALLBACK_COLOR}
              />
            </div>
            <Button type="button" variant="outline" size="icon" onClick={randomizeSecondary} aria-label="Acak warna kedua">
              <Shuffle />
            </Button>
          </div>
        ) : null}
      </div>

      {tokens ? (
        <div className="flex flex-col gap-4 rounded-2xl border border-border p-4">
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

          <div className="flex flex-wrap items-center gap-3">
            <span
              className="flex size-10 items-center justify-center rounded-xl text-sm font-black"
              style={{
                backgroundImage: `linear-gradient(135deg, ${tokens.light.gradientFrom}, ${tokens.light.gradientTo})`,
                color: tokens.light.primaryForeground,
              }}
            >
              L
            </span>
            <button
              type="button"
              tabIndex={-1}
              className="pointer-events-none rounded-lg px-4 py-2.5 text-sm font-semibold shadow-xs"
              style={{
                backgroundImage: `linear-gradient(135deg, ${tokens.light.gradientFrom}, ${tokens.light.gradientTo})`,
                color: tokens.light.primaryForeground,
              }}
            >
              Tombol utama
            </button>
            <Badge style={{ background: tokens.light.accent, color: tokens.light.accentForeground }} className="border-transparent">
              Badge aksen
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Aksen (chip, badge) ikut turun dari warna primary yang dipilih — bukan warna tetap, jadi tetap senada walau
            warna brand diganti.
          </p>
        </div>
      ) : primary === "" ? (
        <p className="text-xs text-muted-foreground">Kosong — memakai warna bawaan aplikasi.</p>
      ) : (
        <p className="text-xs text-destructive">Format warna harus hex 6 digit, mis. #7c5cd6.</p>
      )}

      <div className="safe-bottom-float sticky z-10 -mx-4 flex justify-end gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-sm supports-[backdrop-filter]:bg-background/85">
        <Button type="button" variant="ghost" onClick={resetToDefault}>
          Kembalikan ke bawaan
        </Button>
        <SubmitButton pendingLabel="Menyimpan…" disabled={!canSubmit}>
          Simpan
        </SubmitButton>
      </div>
    </form>
  );
}
