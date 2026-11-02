"use client";

import { useEffect } from "react";

/** Menangkap error di root layout itu sendiri — satu-satunya error.tsx yang harus render <html>/<body> sendiri. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="id">
      <body
        style={{
          display: "flex",
          minHeight: "100dvh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "1.5rem",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#faf8f4",
          color: "#1b1a20",
        }}
      >
        <p style={{ fontSize: "1.125rem", fontWeight: 700 }}>Aplikasi gagal memuat</p>
        <p style={{ maxWidth: "20rem", fontSize: "0.875rem", opacity: 0.7 }}>Terjadi kesalahan. Coba muat ulang halaman.</p>
        <button
          onClick={() => reset()}
          style={{
            height: "2.75rem",
            padding: "0 1rem",
            borderRadius: "0.5rem",
            border: "none",
            background: "#1b1a20",
            color: "#faf8f4",
            fontSize: "0.875rem",
            fontWeight: 600,
          }}
        >
          Muat ulang
        </button>
      </body>
    </html>
  );
}
