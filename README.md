# Lenbee

Aplikasi web manajemen les privat untuk tutor perorangan. Satu sumber kebenaran: **sesi pelajaran**. Ketika tutor menekan **Selesai Mengajar** dan menyimpan, hasilnya otomatis mengalir ke riwayat, laporan, progres, laporan orang tua, statistik, dan tagihan.

Mobile-first (dipakai sambil mengajar, dari ponsel), bisa dipasang sebagai PWA.

## Stack

| Bagian | Teknologi |
| --- | --- |
| Framework | Next.js 16.3 (App Router) + React 19 + TypeScript |
| Database | MySQL 8+ |
| ORM | Drizzle ORM + drizzle-kit |
| UI | Tailwind CSS v4 + Radix primitives (gaya shadcn/ui) |
| Validasi | Zod 4 (satu skema dipakai di klien dan server) |
| Auth | Sesi opaque di database + cookie httpOnly, password bcrypt |
| Uji | Vitest |
| AI | Abstraksi provider Anthropic / OpenAI (opsional) |
| Berkas | Abstraksi storage lokal, siap ditukar ke object storage |

## Prasyarat

- Node.js 20+
- MySQL 8+ berjalan di `127.0.0.1:3306`
- Database kosong bernama `lenbee`

## Menjalankan

```bash
# 1. Dependensi
npm install

# 2. Konfigurasi
cp .env.example .env.local
#    lalu isi DATABASE_URL, contoh:
#    mysql://lenbee:password@127.0.0.1:3306/lenbee

# 3. Skema database
npm run db:migrate

# 4. Data contoh (opsional, tapi disarankan untuk mencoba)
npm run db:seed

# 5. Jalankan
npm run dev
```

Buka http://localhost:3000.

### Kredensial demo

Dibuat oleh `npm run db:seed`. Password sama untuk semua akun: **`Lenbee123!`**

| Peran | Email | Melihat |
| --- | --- | --- |
| Tutor | `tutor@lenbee.id` | Seluruh data murid |
| Orang tua | `orangtua@lenbee.id` | Hanya Aisyah Putri Ramadhani |
| Orang tua | `orangtua.bima@lenbee.id` | Hanya Bima Adi Nugroho |

Akun orang tua kedua sengaja ada untuk membuktikan isolasi data: masing-masing hanya bisa membuka anaknya sendiri.

## Skrip

```bash
npm run dev          # server pengembangan
npm run build        # build produksi
npm start            # jalankan hasil build

npm run typecheck    # generate tipe route Next lalu tsc --noEmit
npm run lint         # eslint
npm test             # vitest run

npm run db:generate  # buat berkas migrasi dari src/db/schema.ts
npm run db:migrate   # terapkan migrasi
npm run db:push      # dorong skema langsung (tanpa berkas migrasi)
npm run db:seed      # isi data contoh; menghapus data lama lebih dulu
```

`db:seed` bersifat idempoten: seluruh tabel aplikasi dikosongkan lalu diisi ulang, sehingga aman dijalankan berkali-kali.

## Alur utama

1. **Beranda** menampilkan sesi hari ini dan sesi yang belum lapor.
2. Tutor memilih anak → membuka sesi → menekan **Selesai Mengajar**.
3. Mengisi kehadiran, durasi, materi, aktivitas, catatan kemampuan, dan teks laporan.
4. **Simpan** menyelesaikan sesi dan menyebarkan hasilnya secara otomatis:
   riwayat sesi, laporan, progres target, catatan kemampuan, laporan orang tua, statistik, dan dasar perhitungan tagihan.

## Fitur

**Tutor**
- Beranda harian, jadwal rutin mingguan, dan kalender sesi
- Manajemen murid dan program (tarif per sesi atau per jam)
- Sesi: selesaikan, batalkan dengan alasan, pindahkan jadwal, sesi tambahan
- Riwayat dan laporan sesi, dengan bantuan penulisan laporan via AI (opsional)
- Target progres dan catatan kemampuan per murid
- Tugas: pembuatan manual atau dengan AI, penilaian otomatis untuk pilihan ganda dan jawaban singkat
- Bank materi (unggah worksheet/ringkasan, unduh lewat tautan terproteksi)
- Tagihan: pratinjau sesi yang bisa ditagih, penerbitan, pembayaran sebagian, tautan publik `share/invoice/[token]`
- Laporan untuk orang tua (draf → final → terkirim)
- Notifikasi, pencarian, pengaturan akun, undangan akun orang tua

**Orang tua**
- Hanya data anaknya sendiri: beranda, laporan, dan tagihan

## Keamanan

- Password di-hash bcrypt (12 putaran); token sesi disimpan sebagai hash SHA-256
- Cookie sesi `httpOnly`, `sameSite=lax`, `secure` di produksi
- Setiap akses data murid melewati `assertStudentAccess` — orang tua tidak bisa membaca anak milik tutor lain, termasuk lewat ID yang ditebak
- Berkas selalu disajikan lewat `/api/files/[...key]` setelah pemeriksaan otorisasi; storage lokal tidak pernah di-`publicUrl`-kan
- Unggahan divalidasi tipe MIME, ukuran, dan magic byte
- Seluruh input diformat lewat skema Zod di server; percobaan login dibatasi

## Struktur

```
src/
  app/
    (app)/        # area tutor
    (parent)/     # area orang tua
    (auth)/       # login, daftar, terima undangan
    (account)/    # notifikasi, pengaturan
    actions/      # Server Actions per domain
    api/          # route handler: AI, berkas, pratinjau tagihan
  components/     # komponen UI
  db/             # schema.ts, index.ts, seed.ts, migrations/
  lib/
    domain/       # logika murni: jadwal, tagihan, penilaian
    services/     # operasi lintas tabel
    auth.ts       # sesi dan password
    authz.ts      # otorisasi per murid
    validation.ts # skema Zod
    storage.ts    # abstraksi penyimpanan
    ai.ts         # abstraksi provider AI
drizzle/          # berkas migrasi SQL
docs/             # dokumentasi dan prompt awal
```

## Batasan

- **Storage `s3` belum diimplementasikan.** `STORAGE_DRIVER=s3` akan melempar error; jalur produksi saat ini adalah disk lokal.
- **Fitur AI butuh API key.** Tanpa `ANTHROPIC_API_KEY` atau `OPENAI_API_KEY`, tombol AI nonaktif dan pengisian laporan dilakukan manual. Aplikasi tetap berfungsi penuh.
- **Belum ada notifikasi email/WhatsApp.** Notifikasi hanya tersimpan di dalam aplikasi; laporan orang tua berstatus "terkirim" tidak mengirim pesan sungguhan.
- **Belum ada uji end-to-end di peramban.** Yang tercakup otomatis baru logika domain, validasi, dan otorisasi (unit test + typecheck + lint + build).
- **Lupa password belum ada.** Password diganti dari halaman pengaturan setelah login.
- Satu murid hanya dimiliki satu tutor; aplikasi belum mendukung banyak tutor dalam satu akun.
