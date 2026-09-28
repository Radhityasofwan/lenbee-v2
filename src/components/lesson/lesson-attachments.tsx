"use client";

import { Loader2, Paperclip, Upload, X } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { FcDocument, FcPicture } from "react-icons/fc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { deleteLessonAttachmentAction, uploadLessonAttachmentAction } from "@/app/actions/lessons";
import { idleState } from "@/lib/form";

export type AttachmentItem = {
  id: number;
  originalName: string;
  mimeType: string;
  size: number;
  kind: string;
  storageKey: string;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileUrl(attachment: AttachmentItem): string {
  return `/api/files/${attachment.storageKey.split("/").map(encodeURIComponent).join("/")}`;
}

function DeleteAttachmentButton({ attachment }: { attachment: AttachmentItem }) {
  const [state, formAction, pending] = useActionState(deleteLessonAttachmentAction, idleState);

  useEffect(() => {
    if (state.ok && state.message) toast.success(state.message);
    else if (state.message && !state.ok) toast.error(state.message);
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="attachmentId" value={attachment.id} />
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
        disabled={pending}
        aria-label={`Hapus ${attachment.originalName}`}
      >
        {pending ? <Loader2 className="animate-spin" /> : <X />}
      </Button>
    </form>
  );
}

export function LessonAttachmentSection({
  lessonId,
  attachments,
}: {
  lessonId: number;
  attachments: AttachmentItem[];
}) {
  const [state, formAction] = useActionState(uploadLessonAttachmentAction, idleState);
  const inputRef = useRef<HTMLInputElement>(null);
  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok && state.message) {
      toast.success(state.message);
      if (inputRef.current) inputRef.current.value = "";
    } else if (state.message && !state.ok) {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <div className="flex flex-col gap-3">
      {attachments.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Belum ada lampiran. Tambahkan foto latihan, worksheet, atau hasil pekerjaan anak.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {attachments.map((attachment) => (
            <li key={attachment.id} className="flex items-center gap-2.5 rounded-lg border border-border p-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                {attachment.kind === "image" ? (
                  <FcPicture className="size-4" />
                ) : (
                  <FcDocument className="size-4" />
                )}
              </span>
              <a
                href={fileUrl(attachment)}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 hover:underline"
              >
                <span className="block truncate text-sm font-medium">{attachment.originalName}</span>
                <span className="block text-xs text-muted-foreground">{formatBytes(attachment.size)}</span>
              </a>
              <DeleteAttachmentButton attachment={attachment} />
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="flex flex-col gap-2">
        <input type="hidden" name="lessonId" value={lessonId} />
        {state.message && !state.ok ? <FormAlert tone="error">{state.message}</FormAlert> : null}
        <input
          ref={inputRef}
          type="file"
          name="file"
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
          className="w-full rounded-lg border border-input bg-transparent p-2 text-xs file:mr-2 file:rounded-md file:border-0 file:bg-muted file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-foreground"
        />
        {errors.file ? <p className="text-xs text-destructive">{errors.file}</p> : null}
        <SubmitButton variant="outline" size="sm" pendingLabel="Mengunggah…" className="self-start">
          <Upload />
          Unggah lampiran
        </SubmitButton>
      </form>

      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Paperclip className="size-3" />
        Maksimal 10 MB per berkas. Gambar dan PDF ditampilkan langsung.
      </p>
    </div>
  );
}
