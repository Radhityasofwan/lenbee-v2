import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { ChevronRight, Sparkles } from "lucide-react";
import { FcDownload, FcOnlineSupport } from "react-icons/fc";
import { updateFaviconAction, updateLogoAction, updatePwaIconAction } from "@/app/actions/branding";
import { AvatarForm, BrandingAssetForm, PasswordForm, ProfileForm } from "./settings-forms";
import { PushNotificationToggle } from "./push-notification-toggle";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { PageHeader } from "@/components/ui/page-header";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { formatDateLong } from "@/lib/datetime";
import { env } from "@/lib/env";
import { parentAccessOverview } from "@/lib/services/parents";
import { brandingUrl, getBrandingAssets } from "@/lib/services/settings";

export const metadata: Metadata = { title: "Profil & Pengaturan" };

export default async function SettingsPage() {
  const session = await requireUser();
  const [row] = await db
    .select({ name: users.name, email: users.email, phone: users.phone, avatarPath: users.avatarPath, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, session.id))
    .limit(1);

  const tutor = session.role === "tutor";
  const parentAccess = tutor ? await parentAccessOverview(session.id) : [];
  const branding = tutor ? await getBrandingAssets() : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Profil & Pengaturan"
        description={tutor ? "Kelola akun pengajar Anda." : "Kelola akun orang tua Anda."}
        action={<Badge variant={tutor ? "accent" : "info"}>{tutor ? "Pengajar" : "Orang tua"}</Badge>}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Foto profil</CardTitle>
          <CardDescription>Tampil di bilah atas dan pada halaman yang Anda akses.</CardDescription>
        </CardHeader>
        <CardContent>
          <AvatarForm name={row?.name ?? session.name} avatarPath={row?.avatarPath ?? null} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data akun</CardTitle>
          <CardDescription>Terdaftar sejak {row ? formatDateLong(row.createdAt.toISOString().slice(0, 10)) : "—"}.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <ProfileForm name={row?.name ?? session.name} phone={row?.phone ?? ""} />
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Email</p>
            <p className="truncate text-sm font-medium">{row?.email ?? session.email}</p>
            <p className="mt-1 text-xs text-muted-foreground">Email tidak bisa diubah sendiri. Hubungi dukungan bila perlu.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Keamanan</CardTitle>
          <CardDescription>Ganti password secara berkala.</CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>

      {tutor ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Akses orang tua</CardTitle>
            <CardDescription>
              Status akun orang tua tiap murid. Buka halaman murid untuk mengundang atau mengirim ulang link undangan.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {parentAccess.length === 0 ? (
              <p className="px-2 py-2 text-xs text-muted-foreground">Belum ada murid aktif.</p>
            ) : (
              parentAccess.map((row) => (
                <Link
                  key={row.studentId}
                  href={`/students/${row.studentId}`}
                  className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
                >
                  <span className="min-w-0 flex-1 truncate">{row.studentName}</span>
                  {row.status === "connected" ? (
                    <Badge variant="success" className="shrink-0 text-[10px]">
                      {row.parentCount} akun
                    </Badge>
                  ) : row.status === "pending" ? (
                    <Badge variant="warning" className="shrink-0 text-[10px]">
                      Menunggu aktivasi
                    </Badge>
                  ) : row.status === "ready" ? (
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      Belum diundang
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      Email belum diisi
                    </Badge>
                  )}
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}

      {tutor ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI &amp; Model</CardTitle>
            <CardDescription>
              Kumpulan API key 9Router, Gemini, dan OpenRouter untuk membuat report, rangkuman, dan soal latihan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/settings/ai"
              className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              <Sparkles className="size-4 text-muted-foreground" />
              Kelola API key
              <ChevronRight className="ml-auto size-4 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {tutor && branding ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Branding aplikasi</CardTitle>
            <CardDescription>
              Ganti logo, favicon (ikon tab browser), dan ikon PWA (saat aplikasi di-install ke layar utama).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Logo
                <InfoTooltip>
                  <strong className="font-semibold text-foreground">Ukuran ideal:</strong> persegi, minimal 256×256px.
                  PNG dengan latar transparan atau SVG supaya tetap tajam di semua ukuran layar.
                </InfoTooltip>
              </p>
              <BrandingAssetForm
                slot="logo"
                hint="Tampil di bilah atas & halaman login. JPG, PNG, WebP, atau SVG."
                previewUrl={brandingUrl("logo", branding.logo)}
                uploadAction={updateLogoAction}
              />
            </div>
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Favicon
                <InfoTooltip>
                  <strong className="font-semibold text-foreground">Ukuran ideal:</strong> persegi 32×32px–64×64px.
                  Bentuk sederhana supaya tetap jelas walau ditampilkan sangat kecil di tab browser.
                </InfoTooltip>
              </p>
              <BrandingAssetForm
                slot="favicon"
                hint="Ikon di tab browser. Idealnya persegi & sederhana."
                previewUrl={brandingUrl("favicon", branding.favicon)}
                uploadAction={updateFaviconAction}
              />
            </div>
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Ikon PWA
                <InfoTooltip>
                  <strong className="font-semibold text-foreground">Ukuran ideal:</strong> persegi 512×512px (minimal
                  192×192px). Beri sedikit jarak dari tepi gambar — sebagian HP memotong ikon jadi bentuk bulat/rounded
                  saat di-install.
                </InfoTooltip>
              </p>
              <BrandingAssetForm
                slot="pwaIcon"
                hint="Ikon saat aplikasi di-install ke layar utama. Gunakan gambar persegi."
                previewUrl={brandingUrl("pwaIcon", branding.pwaIcon)}
                uploadAction={updatePwaIconAction}
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {tutor ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bantuan</CardTitle>
            <CardDescription>Alur setup dan pemakaian Lenbee sehari-hari.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/more/panduan"
              className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              <FcOnlineSupport className="size-4" />
              Panduan penggunaan
              <ChevronRight className="ml-auto size-4 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aplikasi</CardTitle>
          <CardDescription>
            Lenbee bisa dipasang di layar utama HP. Buka menu browser lalu pilih &ldquo;Tambahkan ke layar utama&rdquo;.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FcDownload className="size-4" />
            Mode offline menyimpan halaman yang pernah dibuka.
          </div>
          <div className="border-t border-border pt-4">
            <PushNotificationToggle vapidPublicKey={env.push.vapidPublicKey} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
