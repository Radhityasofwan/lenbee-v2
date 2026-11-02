"use client";

import { RouteError } from "@/components/route-error";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col px-4 py-6">
      <RouteError error={error} reset={reset} />
    </main>
  );
}
