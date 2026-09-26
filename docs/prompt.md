BUILD LENBEE END-TO-END.

Tujuan: ubah seluruh dokumentasi `dokumentasi-lenbee-app-web.md` menjadi aplikasi web production-ready 100% usable. Jangan hanya membuat prototype/mockup.

RULE:
- Baca dan pahami `dokumentasi-lenbee-app-web.md` FULL terlebih dahulu.
- Jangan mengurangi fitur yang terdokumentasi.
- Jangan bertanya kecuali benar-benar blocked; ambil keputusan teknis terbaik sendiri.
- Kerjakan end-to-end sampai aplikasi runnable dan tested.
- Prioritas: SIMPLE, CLEAN, MOBILE-FIRST, FAST, MINIM KLIK, ONE INPUT → MULTIPLE OUTPUTS.
- UX harus terasa seperti personal admin, bukan dashboard CRUD yang ribet.
- Jangan over-engineer.

STACK:
- Next.js latest stable + TypeScript
- App Router
- MySQL 8.x
- Drizzle ORM
- Tailwind CSS + shadcn/ui
- Zod validation
- Auth yang secure
- PWA/mobile-first
- Local file storage abstraction yang siap diganti object storage
- AI provider abstraction untuk report/summary/question generation
- gunakan Server Components/Server Actions/API hanya sesuai kebutuhan
- gunakan library mature; jangan membuat ulang functionality yang sudah tersedia.

DATABASE:
- SQL lokal via MySQL/Sequel Ace
- Host: `127.0.0.1`
- Port: `3306`
- Database: `lenbee`
- Credentials dari `.env.local`, jangan hardcode secret.
- Buat schema, migration, seed dan relasi lengkap.
- Pastikan migration bisa dijalankan fresh dari database kosong.
- Gunakan foreign key, index, unique constraint dan transaction pada operasi penting.

IMPLEMENT:
1. Project setup dari 0.
2. Database architecture.
3. Authentication + authorization Tutor/Parent.
4. Student + Parent + Program.
5. Recurring schedule.
6. Individual/rescheduled/additional/cancelled sessions.
7. One-click "Selesai Mengajar".
8. Lesson report.
9. AI report generation.
10. Learning history.
11. Progress + targets.
12. Learning focus/ulangan.
13. Assignment/question engine + automatic grading.
14. Document/material bank + upload.
15. Automatic invoice + payment status.
16. Parent portal dengan data isolation.
17. Parent updates/summary.
18. Search global.
19. Home dashboard + quick actions.
20. Calendar.
21. Notifications/reminders.
22. PWA/installable mobile experience.
23. Empty/loading/error/success states.
24. Responsive UI.
25. Accessibility dasar.
26. Security: auth, authorization, validation, upload validation, XSS/CSRF/injection protection, ownership checks.
27. Seed realistic demo data.

CORE DOMAIN:
`Lesson Session` adalah source of truth.

Satu session selesai harus dapat menjadi sumber:
Session → History → Report → Progress → Parent Update → Statistics → Invoice Item.

Pastikan perubahan/reschedule hanya memengaruhi occurrence terkait dan tidak merusak recurring schedule.

UX:
- Home langsung menampilkan jadwal hari ini.
- Klik anak → Selesai Mengajar → isi poin → Simpan.
- Jangan memaksa user berpindah banyak halaman.
- Gunakan drawer/modal/sheet bila lebih cepat daripada navigasi.
- Mobile-first.
- Touch-friendly.
- Loading cepat.
- Hindari unnecessary confirmation/dialog.
- Gunakan progressive disclosure.
- Semua form punya sensible defaults dari context/session.

AI:
- Buat provider abstraction.
- API key dari environment.
- Report mengikuti style report yang didokumentasikan.
- AI output selalu editable sebelum dikirim/disimpan sebagai final.
- Jangan membuat AI sebagai dependency untuk fungsi dasar aplikasi.
- Jika API tidak tersedia, aplikasi tetap usable.

QUALITY GATE:
Setelah implementasi:
- install dependencies
- migrate database
- seed database
- run typecheck
- run lint
- run tests
- build production
- fix SEMUA error/warning yang relevan
- test critical user flows
- audit authorization/data isolation
- audit responsive UI
- audit database relations
- audit empty/error/loading states
- audit broken links/routes
- audit console/runtime errors

CRITICAL FLOWS WAJIB BERHASIL:
1. Login
2. Tambah anak
3. Tambah program
4. Buat jadwal rutin
5. Jadwal muncul Home
6. Selesai Mengajar
7. Simpan report
8. History otomatis ter-update
9. Progress otomatis ter-update
10. Generate AI report
11. Tambah additional/reschedule/cancel session
12. Generate invoice
13. Update payment
14. Upload document
15. Buat & kerjakan latihan
16. Nilai otomatis tersimpan
17. Parent login hanya melihat anak miliknya
18. Parent melihat progress/report/history
19. Search anak
20. PWA install/run

DATABASE CONNECTION:
Gunakan `.env.local`:
`DATABASE_URL="mysql://USER:PASSWORD@127.0.0.1:3306/lenbee"`

Jika MySQL lokal tersedia, verifikasi koneksi dan buat database/migration yang diperlukan. Jangan menghapus database/data existing tanpa explicit confirmation.

DOCUMENTATION:
Update `README.md` berisi:
- requirements
- setup
- `.env.local`
- database setup
- migration
- seed
- development
- production build
- AI configuration
- PWA
- test account/demo account

FINAL:
Jangan berhenti setelah coding selesai. Lakukan self-review → test → fix → test ulang → build ulang sampai clean.

Output terakhir hanya:
1. Status aplikasi
2. Stack
3. Database
4. Fitur selesai
5. Test/build result
6. Cara menjalankan
7. Credential demo
8. Jika ada limitation nyata, sebutkan singkat.

MULAI SEKARANG. Baca dokumentasi terlebih dahulu, lalu implementasikan seluruh aplikasi sampai siap digunakan.