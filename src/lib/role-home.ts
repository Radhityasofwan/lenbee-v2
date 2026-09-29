import type { User } from "@/db/schema";

/** Halaman beranda per role. Modul ini sengaja tanpa "server-only" — dipakai juga dari Client Component (top-bar.tsx). */
export const ROLE_HOME: Record<User["role"], string> = {
  tutor: "/home",
  parent: "/parent",
  super_admin: "/admin",
};
