"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Bell, Check, ChevronDown, Info, Lightbulb, Sparkles, UserPlus } from "lucide-react";
import {
  FcApprove,
  FcCalendar,
  FcConferenceCall,
  FcDocument,
  FcGraduationCap,
  FcIdea,
  FcLink,
  FcPaid,
  FcReading,
  FcSearch,
  FcSmartphoneTablet,
  FcTodoList,
} from "react-icons/fc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type IconComponent = ComponentType<{ className?: string }>;

type Step = {
  icon: IconComponent;
  title: string;
  where: string;
  summary: string;
  points: string[];
  note?: string;
  links?: { href: string; label: string }[];
};

const STEPS: Step[] = [
  {
    icon: UserPlus,
    title: "Buat akun pengajar",
    where: "Halaman Daftar",
    summary: "Satu akun untuk satu tutor. Semua murid, jadwal, dan tagihan ada di dalamnya.",
    points: [
      "Isi Nama, Email, Nomor telepon (opsional), dan Password.",
      "Setelah mendaftar Anda langsung masuk ke Beranda.",
      "Akun orang tua tidak dibuat dari sini — orang tua masuk lewat tautan undangan (lihat langkah 8).",
    ],
    links: [{ href: "/register", label: "Halaman daftar" }],
  },
  {
    icon: FcConferenceCall,
    title: "Tambahkan murid",
    where: "Menu Murid → tombol Murid baru",
    summary: "Murid adalah pusat data. Program, jadwal, dan tagihan menempel padanya.",
    points: [
      "Isi Nama lengkap, Nama panggilan, Tanggal lahir, Sekolah, dan Kelas.",
      "Bagian Orang tua / wali: Nama orang tua, Nomor WhatsApp, dan Email orang tua. Email inilah yang menyambungkan akses orang tua nanti.",
      "Field Catatan bersifat pribadi — tampil sebagai “Catatan pribadi” di detail murid dan tidak dibaca orang tua.",
      "Biarkan “Murid aktif” tercentang. Nonaktifkan bila murid berhenti les; riwayat dan tagihan tetap tersimpan.",
    ],
    links: [{ href: "/students/new", label: "Tambah murid" }],
  },
  {
    icon: FcReading,
    title: "Buat program les dan tarifnya",
    where: "Detail murid → kartu Program les → + Tambah",
    summary: "Program menentukan tarif dan durasi yang dipakai saat menagih.",
    points: [
      "Isi Nama program, Mata pelajaran, dan Tarif (Rp).",
      "Pilih Satuan tarif: per pertemuan atau per jam.",
      "Atur Durasi (menit) dan Sesi per bulan bila ingin target pertemuan.",
      "Tarif dipakai saat membuat invoice dari pertemuan yang selesai — isi dengan benar sejak awal.",
    ],
    note: "Bila murid mengikuti lebih dari satu mata pelajaran, buat satu program untuk masing-masing agar tagihan terpisah rapi.",
  },
  {
    icon: FcCalendar,
    title: "Atur jadwal rutin",
    where: "Detail murid → kartu Jadwal rutin → + Tambah",
    summary:
      "Pertemuan mendatang dibuat otomatis dari jadwal ini (sekitar 60 hari ke depan) — tidak perlu input satu per satu.",
    points: [
      "Pilih Program, lalu Hari, Jam mulai, dan Durasi (menit).",
      "Frekuensi: Setiap minggu atau Dua mingguan.",
      "Isi Mulai tanggal, dan Selesai bila les dibatasi periode tertentu.",
      "Tambahkan Lokasi (mis. “Rumah murid”) dan Catatan bila perlu.",
      "Pastikan “Jadwal aktif” tercentang agar pertemuan baru terus dibuat.",
    ],
  },
  {
    icon: FcApprove,
    title: "Mengajar, lalu tekan “Selesai Mengajar”",
    where: "Jadwal atau Beranda → baris pertemuan",
    summary:
      "Ini langkah terpenting. Sekali isi, datanya mengalir ke riwayat, statistik, laporan orang tua, dan tagihan.",
    points: [
      "Ketuk baris pertemuan di Jadwal atau Beranda, lalu buka “Selesai Mengajar”.",
      "Kehadiran: Hadir atau Tidak hadir. Durasi bisa diubah bila sesi lebih cepat atau lebih lama dari jadwal.",
      "Fokus pertemuan: Materi rutin, Review, Persiapan ulangan, Tugas/PR, Remedial, atau Lainnya.",
      "Isi Materi / topik, Materi yang dibahas, dan Kegiatan belajar.",
      "Catatan internal tidak ditampilkan ke orang tua.",
      "Laporan untuk orang tua bisa ditulis sendiri atau lewat “Susun dengan AI”.",
      "Biarkan “Hitung pertemuan ini ke tagihan” tercentang — hilangkan centang untuk sesi gratis atau sesi yang tidak ditagih.",
      "Tekan “Simpan & sebarkan”.",
    ],
    note: "Bila laporan belum diisi, baris pertemuan menandai “Laporan belum diisi — orang tua belum menerima kabar.” Tombolnya berubah jadi “Lihat / Ubah Laporan” setelah laporan tersimpan. Rincian tiap sesi bisa dibuka lagi dari Riwayat pertemuan di detail murid.",
    links: [
      { href: "/schedule", label: "Buka jadwal" },
      { href: "/home", label: "Buka beranda" },
    ],
  },
  {
    icon: FcPaid,
    title: "Buat invoice dari pertemuan yang selesai",
    where: "Pintasan Invoice di Beranda → tombol Buat invoice",
    summary: "Tagihan dihitung otomatis dari pertemuan selesai yang belum pernah ditagih.",
    points: [
      "Pilih Murid, lalu Awal periode dan Akhir periode.",
      "Jatuh tempo default dua minggu setelah hari ini — bisa diubah.",
      "Tambahkan Diskon (Rp) dan Catatan yang tampil di invoice bila perlu.",
      "Pratinjau muncul otomatis: rincian tiap baris beserta jumlah pertemuan dan harga satuannya (mis. “Les Matematika 8 × Rp150.000”), lalu Subtotal, Diskon, dan Total.",
      "Tombol simpan aktif hanya bila ada pertemuan yang bisa ditagih pada periode itu.",
      "Setelah dibuat, invoice punya bagian “Tautan untuk orang tua” berisi alamat /share/invoice/… yang bisa dibuka tanpa login, lengkap dengan tombol cetak.",
    ],
    links: [{ href: "/invoices", label: "Buka invoice" }],
  },
  {
    icon: Sparkles,
    title: "Kirim rangkuman ke orang tua",
    where: "Pintasan Laporan di Beranda → Buat rangkuman",
    summary: "Rangkuman diambil dari sesi les yang sudah selesai pada periode yang dipilih.",
    points: [
      "Pilih Murid dan Jenis rangkuman: Rekap mingguan, Rekap bulanan, atau Update singkat.",
      "Awal dan akhir periode terisi otomatis sesuai jenis — sesuaikan bila perlu.",
      "Judul terisi otomatis, bisa diganti.",
      "Isi rangkuman bisa ditulis sendiri atau lewat “Susun dengan AI”.",
      "Simpan sebagai Draft dulu bila belum yakin, atau Final bila sudah siap.",
      "Ketuk ikon kirim pada baris rangkuman untuk mengirimnya. Statusnya berubah jadi Terkirim dan rangkuman muncul di halaman orang tua.",
    ],
    links: [{ href: "/reports", label: "Buka halaman Laporan" }],
  },
  {
    icon: FcLink,
    title: "Sambungkan akses orang tua",
    where: "Detail murid → kartu Akses orang tua",
    summary: "Orang tua hanya melihat anaknya sendiri: perkembangan dan tagihan. Data murid lain tidak terlihat.",
    points: [
      "Buka detail murid, ketuk Undang di kartu “Akses orang tua”. Nama dan email orang tua biasanya sudah terisi dari data murid.",
      "Setelah link undangan dibuat, kirim lewat tombol WhatsApp atau Email, atau salin lalu bagikan sendiri. Link berlaku 14 hari.",
      "Bila email itu sudah terdaftar sebagai akun orang tua, tidak ada link yang dibuat — akses langsung tersambung.",
      "Undangan yang belum dipakai tampil dengan status Menunggu aktivasi dan bisa dikirim ulang atau dibatalkan dari kartu yang sama.",
      "Orang tua membuka link, membuat password sendiri, lalu mendarat di area orang tua.",
      "Halaman Profil & pengaturan punya ringkasan status akses seluruh murid, lengkap dengan tautan ke tiap murid.",
      "Di area orang tua tersedia Beranda anak (jadwal berikutnya, pertemuan bulan ini, terakhir belajar, hasil latihan, aktivitas, laporan terakhir), halaman Laporan, dan halaman Invoice yang menuju tautan invoice publik.",
    ],
  },
];

const DAILY: { icon: IconComponent; title: string; body: string }[] = [
  {
    icon: FcCalendar,
    title: "Sesi tambahan & perubahan jadwal",
    body: "Buat pertemuan di luar jadwal rutin lewat tombol “Sesi tambahan” di halaman Jadwal; pertemuan ini langsung masuk ke riwayat, tagihan, dan laporan orang tua. Pertemuan yang sudah terjadwal bisa dipindahkan atau dibatalkan dengan alasan Anak berhalangan, Tutor berhalangan, atau Libur.",
  },
  {
    icon: FcSearch,
    title: "Cari",
    body: "Halaman Cari menelusuri seluruh data sekaligus: profil murid, program belajar, jadwal, riwayat pertemuan, laporan, invoice, hasil latihan, dan dokumen. Ketik nama murid, materi, atau topik.",
  },
  {
    icon: FcTodoList,
    title: "Tugas",
    body: "Susun soal latihan (pilihan ganda, jawaban singkat, uraian) per murid, atur tingkat kesulitan, lalu publikasikan agar bisa dikerjakan. Skor terbaik tercatat di baris tugas.",
  },
  {
    icon: FcDocument,
    title: "Dokumen",
    body: "Simpan worksheet, soal, rangkuman, bahan ajar, atau dokumen sekolah. Beri tag materi supaya mudah dipakai ulang saat mengajar.",
  },
  {
    icon: Bell,
    title: "Notifikasi",
    body: "Pengingat jadwal dan tagihan muncul di menu Notifikasi. Angka pada ikon lonceng di bilah atas menandakan ada yang belum dibaca.",
  },
  {
    icon: FcSmartphoneTablet,
    title: "Pasang di layar utama",
    body: "Lenbee bisa dipasang seperti aplikasi. Buka menu browser, pilih “Tambahkan ke layar utama”. Halaman yang pernah dibuka tetap bisa diakses saat koneksi terputus.",
  },
  {
    icon: FcGraduationCap,
    title: "Profil & pengaturan",
    body: "Ubah nama, foto, dan password, lihat ringkasan status akses orang tua tiap murid, dan buka Panduan penggunaan di menu Profil & pengaturan (lewat avatar di bilah atas). Tema gelap dan keluar akun ada di panel avatar yang sama.",
  },
];

const NOTES = [
  "Tombol “Susun dengan AI” tetap berguna walau AI belum dikonfigurasi — hasilnya disusun dari data les Anda, bukan dikarang. Laporan yang dibuat lewat tombol ini ditandai AI.",
  "Tanpa aplikasi email atau WhatsApp, rangkuman tidak terkirim otomatis. Status rangkuman tetap berubah jadi Terkirim dan isinya tampil di halaman orang tua.",
  "Tautan invoice /share/invoice/… bisa dibuka siapa pun yang memilikinya, tanpa login. Bagikan hanya ke orang tua yang bersangkutan.",
  "Setiap murid hanya terhubung ke satu tutor.",
];

const SECTIONS = [
  { id: "setup", label: "Setup A–Z" },
  { id: "daily", label: "Sehari-hari" },
  { id: "notes", label: "Perlu diketahui" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

const STORAGE_KEY = "lenbee:panduan:done";

export function PanduanGuide() {
  const [section, setSection] = useState<SectionId>("setup");
  const [active, setActive] = useState(0);
  const [done, setDone] = useState<number[]>([]);
  const [openDaily, setOpenDaily] = useState<string | null>(null);

  // Dibaca setelah mount supaya markup server dan klien tetap sama.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setDone(
            parsed.filter(
              (value): value is number =>
                Number.isInteger(value) && value >= 0 && value < STEPS.length,
            ),
          );
        }
      } catch {
        // localStorage bisa diblokir (mode privat) — panduan tetap tampil tanpa progres.
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  function toggleDone(index: number) {
    const next = done.includes(index) ? done.filter((item) => item !== index) : [...done, index];
    setDone(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Progres hanya kemudahan; gagal menyimpan tidak menghalangi.
    }
  }

  const step = STEPS[active];
  const isDone = done.includes(active);
  const progress = Math.round((done.length / STEPS.length) * 100);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <FcIdea className="size-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Satu kali input, banyak hasil</p>
              <p className="text-xs text-muted-foreground">
                Pertemuan les adalah sumber data utama. Begitu Anda menekan “Selesai Mengajar”,
                catatannya langsung masuk ke riwayat murid, statistik, laporan untuk orang tua, dan
                siap ditagihkan.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="shrink-0 text-xs font-medium text-muted-foreground">
              {done.length}/{STEPS.length} langkah
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="inline-flex h-10 w-full items-center gap-1 rounded-lg bg-muted p-1 text-muted-foreground">
        {SECTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSection(item.id)}
            aria-pressed={section === item.id}
            className={`inline-flex flex-1 items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all ${
              section === item.id ? "bg-card text-foreground shadow-xs" : "hover:text-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {section === "setup" ? (
        <div className="flex flex-col gap-3">
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {STEPS.map((item, index) => {
              const selected = index === active;
              const finished = done.includes(index);
              return (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => setActive(index)}
                  aria-label={`Langkah ${index + 1}: ${item.title}`}
                  aria-current={selected}
                  className={`flex size-9 shrink-0 items-center justify-center rounded-lg border text-xs font-semibold transition-colors ${
                    selected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {finished ? <Check className="size-3.5" /> : index + 1}
                </button>
              );
            })}
          </div>

          <Card>
            <CardContent className="flex flex-col gap-3 p-4">
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <step.icon className="size-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <Badge variant="outline" className="text-[10px]">
                    Langkah {active + 1} dari {STEPS.length}
                  </Badge>
                  <p className="mt-1 text-sm font-semibold">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.where}</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">{step.summary}</p>

              <ul className="flex flex-col gap-1.5">
                {step.points.map((point) => (
                  <li key={point} className="flex gap-2 text-xs text-muted-foreground">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>

              {step.note ? (
                <div className="flex gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
                  <Info className="mt-0.5 size-3.5 shrink-0" />
                  <span>{step.note}</span>
                </div>
              ) : null}

              {step.links ? (
                <div className="flex flex-wrap gap-2">
                  {step.links.map((link) => (
                    <Button
                      key={link.href}
                      asChild
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                    >
                      <Link href={link.href}>{link.label}</Link>
                    </Button>
                  ))}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                <button
                  type="button"
                  onClick={() => toggleDone(active)}
                  className={`flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors ${
                    isDone
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Check className="size-3.5" />
                  {isDone ? "Sudah dilakukan" : "Tandai sudah dilakukan"}
                </button>
                <div className="ml-auto flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    disabled={active === 0}
                    onClick={() => setActive((index) => Math.max(0, index - 1))}
                  >
                    <ArrowLeft />
                    Sebelumnya
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={active === STEPS.length - 1}
                    onClick={() => setActive((index) => Math.min(STEPS.length - 1, index + 1))}
                  >
                    Berikutnya
                    <ArrowRight />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {section === "daily" ? (
        <Card>
          <CardContent className="flex flex-col gap-0.5 p-1.5">
            {DAILY.map((item) => {
              const open = openDaily === item.title;
              return (
                <div key={item.title}>
                  <button
                    type="button"
                    onClick={() => setOpenDaily(open ? null : item.title)}
                    aria-expanded={open}
                    className="flex w-full items-center gap-3 rounded-lg px-2.5 py-3 text-left transition-colors hover:bg-muted"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <item.icon className="size-4.5" />
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-medium">{item.title}</span>
                    <ChevronDown
                      className={`size-4 shrink-0 text-muted-foreground transition-transform ${
                        open ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {open ? (
                    <p className="px-2.5 pb-3 pl-14 text-xs text-muted-foreground">{item.body}</p>
                  ) : null}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      {section === "notes" ? (
        <Card>
          <CardContent className="flex flex-col gap-3 p-4">
            {NOTES.map((note) => (
              <div key={note} className="flex gap-2 text-xs text-muted-foreground">
                <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <span>{note}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
