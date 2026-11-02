import { Skeleton } from "@/components/ui/skeleton";

/** Dipakai di loading.tsx tiap grup route agar navigasi tidak menampilkan blank screen. */
export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
