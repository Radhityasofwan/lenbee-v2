import { redirect } from "next/navigation";

/** Pencarian sekarang jadi spotlight (ikon kaca pembesar / ⌘K) di atas halaman manapun, bukan halaman penuh. */
export default function SearchPage() {
  redirect("/home");
}
