"use client";

import { Check, Undo2 } from "lucide-react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { setFeedbackStatusAction } from "@/app/actions/feedback";
import { Button } from "@/components/ui/button";
import { idleState } from "@/lib/form";

export function FeedbackStatusButton({ id, status }: { id: number; status: "new" | "reviewed" }) {
  const router = useRouter();
  const [state, action] = useActionState(setFeedbackStatusAction, idleState);
  const reviewed = status === "reviewed";

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);

  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={reviewed ? "new" : "reviewed"} />
      <Button
        type="submit"
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground"
        aria-label={reviewed ? "Tandai belum ditinjau" : "Tandai sudah ditinjau"}
      >
        {reviewed ? <Undo2 /> : <Check />}
      </Button>
    </form>
  );
}
