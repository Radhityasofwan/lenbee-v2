"use client";

import { Sparkles } from "lucide-react";
import { useActionState } from "react";
import { generatePracticeAction } from "@/app/actions/assignments";
import { FormAlert } from "@/components/ui/form-alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { idleState } from "@/lib/form";

export function PracticeGenerator({ studentId }: { studentId: number }) {
  const [state, action] = useActionState(generatePracticeAction, idleState);

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="studentId" value={studentId} />
      {state.message && !state.ok ? <FormAlert tone="error">{state.message}</FormAlert> : null}
      <SubmitButton variant="outline" size="sm" className="h-9 self-start text-xs" pendingLabel="Membuat latihan…">
        <Sparkles />
        Buat latihan tambahan (AI)
      </SubmitButton>
    </form>
  );
}
