"use client";

import { Power, PowerOff } from "lucide-react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toggleAccountActiveAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { idleState } from "@/lib/form";

export function ToggleActiveButton({ accountId, isActive }: { accountId: number; isActive: boolean }) {
  const router = useRouter();
  const [state, action] = useActionState(toggleAccountActiveAction, idleState);

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);

  return (
    <form action={action}>
      <input type="hidden" name="accountId" value={accountId} />
      <input type="hidden" name="isActive" value={isActive ? "false" : "true"} />
      <Button
        type="submit"
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground"
        aria-label={isActive ? "Nonaktifkan akun" : "Aktifkan akun"}
      >
        {isActive ? <PowerOff /> : <Power />}
      </Button>
    </form>
  );
}
