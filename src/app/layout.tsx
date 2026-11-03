import type { Metadata, Viewport } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { PwaRegister } from "@/components/pwa-register";
import { deriveThemeTokens } from "@/lib/domain/theme";
import { brandingUrl, getBrandingAsset, getThemeConfig } from "@/lib/services/settings";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  variable: "--font-sans-id",
  subsets: ["latin"],
  display: "swap",
});

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const faviconUrl = brandingUrl("favicon", await getBrandingAsset("favicon"));

  return {
    title: {
      default: "Lenbee — Manajemen Les Privat",
      template: "%s · Lenbee",
    },
    description:
      "Kelola murid, jadwal, laporan belajar, progres, tagihan, dan komunikasi orang tua dalam satu aplikasi.",
    applicationName: "Lenbee",
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      title: "Lenbee",
      statusBarStyle: "default",
    },
    icons: faviconUrl
      ? { icon: [{ url: faviconUrl }], apple: [{ url: faviconUrl }] }
      : {
          icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
          apple: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
        },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f4" },
    { media: "(prefers-color-scheme: dark)", color: "#1b1a20" },
  ],
};

function cssTokens(t: { primary: string; primaryForeground: string; ring: string; accent: string; accentForeground: string; gradientFrom: string; gradientTo: string }): string {
  return `--primary:${t.primary};--primary-foreground:${t.primaryForeground};--ring:${t.ring};--accent:${t.accent};--accent-foreground:${t.accentForeground};--primary-gradient:linear-gradient(135deg,${t.gradientFrom},${t.gradientTo});`;
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const themeConfig = await getThemeConfig();
  const tokens = themeConfig ? deriveThemeTokens(themeConfig) : null;

  return (
    <html lang="id" suppressHydrationWarning className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        {tokens ? (
          <style>{`:root{${cssTokens(tokens.light)}}
.dark{${cssTokens(tokens.dark)}}`}</style>
        ) : null}
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
        <PwaRegister />
        <PwaInstallPrompt />
      </body>
    </html>
  );
}
