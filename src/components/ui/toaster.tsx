"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      offset={16}
      mobileOffset={16}
      toastOptions={{
        classNames: {
          toast: "rounded-xl border border-border bg-popover text-popover-foreground shadow-lg",
          description: "text-muted-foreground",
        },
      }}
    />
  );
}
