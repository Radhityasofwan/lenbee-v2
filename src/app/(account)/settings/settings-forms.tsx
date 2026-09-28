"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { removeAvatarAction, updateAvatarAction } from "@/app/actions/account";
import { removeBrandingAssetAction } from "@/app/actions/branding";
import { changePasswordAction, updateProfileAction } from "@/app/actions/students";
import { StudentAvatar } from "@/components/student-avatar";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { idleState, type ActionState } from "@/lib/form";
import { useActionToast } from "@/lib/hooks/use-action-toast";

export function ProfileForm({ name, phone }: { name: string; phone: string }) {
  const router = useRouter();
  const [state, action] = useActionState(updateProfileAction, idleState);
  const errors = state.fieldErrors ?? {};

  useActionToast(state, () => router.refresh());

  return (
    <form action={action} className="flex flex-col gap-4">
      {state.message && !state.ok ? <FormAlert tone="error">{state.message}</FormAlert> : null}

      <FieldGroup>
        <Field label="Nama" htmlFor="profile-name" error={errors.name} required>
          <Input id="profile-name" name="name" defaultValue={name} maxLength={120} required />
        </Field>

        <Field
          label="Nomor WhatsApp"
          htmlFor="profile-phone"
          hint="Dipakai orang tua untuk menghubungi Anda."
          error={errors.phone}
        >
          <Input id="profile-phone" name="phone" type="tel" inputMode="tel" defaultValue={phone} placeholder="0812…" />
        </Field>
      </FieldGroup>

      <SubmitButton pendingLabel="Menyimpan…">Simpan profil</SubmitButton>
    </form>
  );
}

export function AvatarForm({ name, avatarPath }: { name: string; avatarPath: string | null }) {
  const router = useRouter();
  const [uploadState, uploadAction] = useActionState(updateAvatarAction, idleState);
  const [removeState, removeAction] = useActionState(removeAvatarAction, idleState);
  const [fileName, setFileName] = useState("");
  const errors = uploadState.fieldErrors ?? {};

  useActionToast([uploadState, removeState].find((item) => item.message) ?? idleState, () => {
    setFileName("");
    router.refresh();
  });

  return (
    <div className="flex flex-col gap-4">
      {(uploadState.message && !uploadState.ok) || (removeState.message && !removeState.ok) ? (
        <FormAlert tone="error">{uploadState.message ?? removeState.message}</FormAlert>
      ) : null}

      <div className="flex items-center gap-4">
        <StudentAvatar name={name} src={avatarPath ? `/api/files/${avatarPath}` : null} size="lg" />
        <div className="min-w-0 flex-1">
          <input
            name="avatar"
            type="file"
            accept="image/*"
            onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
            form="avatar-form"
            className="w-full rounded-lg border border-input bg-transparent p-2 text-xs file:mr-2 file:rounded-md file:border-0 file:bg-muted file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-foreground"
          />
          {errors.avatar ? (
            <p className="mt-1 text-xs text-destructive">{errors.avatar}</p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">{fileName || "JPG, PNG, atau WebP."}</p>
          )}
        </div>
      </div>

      <form id="avatar-form" action={uploadAction} className="flex flex-wrap gap-2">
        <SubmitButton size="sm" pendingLabel="Mengunggah…" disabled={!fileName}>
          Unggah foto
        </SubmitButton>
        {avatarPath ? (
          <Button
            type="submit"
            formAction={removeAction}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
          >
            Hapus foto
          </Button>
        ) : null}
      </form>
    </div>
  );
}

export function BrandingAssetForm({
  slot,
  hint,
  previewUrl,
  uploadAction,
}: {
  slot: "logo" | "favicon" | "pwaIcon";
  hint: string;
  previewUrl: string | null;
  uploadAction: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const router = useRouter();
  const formId = `branding-${slot}-form`;
  const [uploadState, uploadFormAction] = useActionState(uploadAction, idleState);
  const [removeState, removeAction] = useActionState(removeBrandingAssetAction, idleState);
  const [fileName, setFileName] = useState("");
  const errors = uploadState.fieldErrors ?? {};

  useActionToast([uploadState, removeState].find((item) => item.message) ?? idleState, () => {
    setFileName("");
    router.refresh();
  });

  return (
    <div className="flex flex-col gap-3">
      {(uploadState.message && !uploadState.ok) || (removeState.message && !removeState.ok) ? (
        <FormAlert tone="error">{uploadState.message ?? removeState.message}</FormAlert>
      ) : null}

      <div className="flex items-center gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-muted/40">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- gambar diunggah tutor, dimensi tidak diketahui saat build.
            <img src={previewUrl} alt="" className="size-full object-contain p-1.5" />
          ) : (
            <span className="text-[10px] text-muted-foreground">Bawaan</span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <input
            name={slot}
            type="file"
            accept="image/*"
            onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
            form={formId}
            className="w-full rounded-lg border border-input bg-transparent p-2 text-xs file:mr-2 file:rounded-md file:border-0 file:bg-muted file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-foreground"
          />
          {errors[slot] ? (
            <p className="mt-1 text-xs text-destructive">{errors[slot]}</p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">{fileName || hint}</p>
          )}
        </div>
      </div>

      <form id={formId} action={uploadFormAction} className="flex flex-wrap gap-2">
        <input type="hidden" name="slot" value={slot} />
        <SubmitButton size="sm" variant="outline" pendingLabel="Mengunggah…" disabled={!fileName}>
          Unggah
        </SubmitButton>
        {previewUrl ? (
          <Button
            type="submit"
            formAction={removeAction}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
          >
            Kembalikan ke bawaan
          </Button>
        ) : null}
      </form>
    </div>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, idleState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-4">
      {state.message && !state.ok ? <FormAlert tone="error">{state.message}</FormAlert> : null}

      <FieldGroup>
        <Field label="Password saat ini" htmlFor="current-password" error={errors.currentPassword} required>
          <Input id="current-password" name="currentPassword" type="password" autoComplete="current-password" required />
        </Field>

        <Field label="Password baru" htmlFor="new-password" hint="Minimal 8 karakter." error={errors.newPassword} required>
          <Input id="new-password" name="newPassword" type="password" autoComplete="new-password" minLength={8} required />
        </Field>

        <Field label="Ulangi password baru" htmlFor="confirm-password" error={errors.confirmPassword} required>
          <Input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
      </FieldGroup>

      <SubmitButton variant="outline" pendingLabel="Menyimpan…">
        Ubah password
      </SubmitButton>
    </form>
  );
}
