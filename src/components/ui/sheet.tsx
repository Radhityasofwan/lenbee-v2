"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { DialogOverlay, DialogPortal } from "./dialog";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

/** Bottom sheet mobile-first: konten utama aplikasi dibuka dari bawah layar. */
export function SheetContent({
  className,
  children,
  title,
  description,
  showClose = true,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & {
  title: ReactNode;
  description?: ReactNode;
  showClose?: boolean;
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border border-b-0 border-border bg-card shadow-lg sm:max-w-2xl",
          "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=open]:duration-300",
          "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=closed]:duration-200",
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
          <div className="min-w-0">
            <DialogPrimitive.Title className="truncate text-lg font-semibold">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-0.5 text-sm text-muted-foreground">
                {description}
              </DialogPrimitive.Description>
            ) : null}
          </div>
          {showClose ? (
            <DialogPrimitive.Close
              className="-mt-1 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Tutup"
            >
              <X className="size-5" />
            </DialogPrimitive.Close>
          ) : null}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

/** Baris aksi yang menempel di bawah sheet. */
export function SheetFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "sticky bottom-0 mt-4 flex flex-col-reverse gap-2 border-t border-border bg-card pt-3 pb-1 sm:flex-row sm:justify-end",
        "safe-bottom",
        className,
      )}
      {...props}
    />
  );
}
