/** Nomor Indonesia (0xxx / 8xxx / sudah 62xxx) dinormalkan ke format wa.me. */
export function whatsappHref(phone: string | null | undefined, message: string): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  const target = digits.startsWith("0") ? `62${digits.slice(1)}` : digits.startsWith("8") ? `62${digits}` : digits;
  const text = encodeURIComponent(message);
  return target ? `https://wa.me/${target}?text=${text}` : `https://wa.me/?text=${text}`;
}
