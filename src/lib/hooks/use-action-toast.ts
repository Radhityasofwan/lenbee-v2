"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { ActionState } from "@/lib/form";

export function useActionToast(state: ActionState, onSuccess?: () => void, onError?: () => void) {
  const successHandler = useRef(onSuccess);
  const errorHandler = useRef(onError);

  useEffect(() => {
    successHandler.current = onSuccess;
    errorHandler.current = onError;
  }, [onSuccess, onError]);

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) {
      toast.success(state.message);
      successHandler.current?.();
    } else {
      toast.error(state.message);
      errorHandler.current?.();
    }
  }, [state]);
}
