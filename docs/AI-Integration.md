# Plan: Integrasi AI Multi-Provider (Google Gemini + OpenRouter)

Referensi implementasi awal: `src/lib/ai-router.ts`, `src/lib/ai-note.ts`, `src/lib/ai-key-crypto.ts`, `src/components/ui/AiKeyManager.tsx`. Dokumen ini menggeneralisasi pola tersebut supaya bisa dipakai ulang di aplikasi lain, dengan tambahan: provider `openrouter` eksplisit (bukan cuma "openai-compatible" generik) dan sinkronisasi daftar model per provider agar tidak hardcode.

## Tujuan

1. Halaman Settings untuk mengelola **lebih dari satu API key** (multi-key, multi-alias, priority order).
2. Support dua provider utama: **Google AI (Gemini)** dan **OpenRouter**, dengan kemungkinan tambah provider lain tanpa ubah struktur inti.
3. Daftar model **sinkron otomatis** dari provider (bukan hardcoded list yang bisa basi), dengan fallback list kalau fetch gagal.
4. Routing konsisten: health check, circuit breaker, failover antar key/model, retry.

## Arsitektur

```
┌─────────────────────┐
│ Settings UI          │  tambah/edit/hapus API key, pilih provider,
│ (ApiKeyManager)       │  test koneksi, lihat model list live
└──────────┬───────────┘
           │
┌──────────▼───────────┐
│ API: /api/ai-keys     │  CRUD key (encrypted at rest)
│ /api/ai-keys/:id/test │  test key -> validasi + fetch model list
│ /api/ai-models/sync   │  refresh model list per provider
└──────────┬───────────┘
           │
┌──────────▼───────────┐
│ lib/ai-providers/     │  adapter per provider (interface sama)
│  ├─ google.ts         │  Gemini: generateContent + listModels
│  ├─ openrouter.ts     │  OpenRouter: chat/completions + /models
│  └─ types.ts          │  AIProvider interface
└──────────┬───────────┘
           │
┌──────────▼───────────┐
│ lib/ai-router.ts      │  pilih key sehat -> pilih model -> call adapter
│                       │  -> retry/failover -> record health
└───────────────────────┘
```

## Skema Database (Prisma, generik)

Sudah ada polanya di matik-in (`AiApiKey`, `AiModel`, `AiHealth`, `AiRoute`). Perubahan yang perlu:

```prisma
model AiApiKey {
  id               String   @id @default(cuid())
  alias            String
  provider         String   // "google" | "openrouter"
  apiKeyEncrypted  String
  baseUrl          String?  // default per provider, override jika perlu
  modelAllowed     String?  // JSON array model id, kosong = pakai semua model sinkron
  priority         Int      @default(100)
  isActive         Boolean  @default(true)
  healthStatus     String   @default("HEALTHY") // HEALTHY | COOLDOWN | DISABLED
  cooldownUntil    DateTime?
  lastHealthCheck  DateTime?
  createdAt        DateTime @default(now())
}

model AiModel {
  id          String   @id @default(cuid())
  provider    String   // "google" | "openrouter"
  modelId     String   // id asli dari provider, mis. "gemini-2.5-flash", "openai/gpt-4o-mini"
  name        String
  taskTypes   String   // comma-separated
  isActive    Boolean  @default(true)
  syncedAt    DateTime @default(now())

  @@unique([provider, modelId])
}

model AiHealth { /* sama seperti existing */ }
model AiRoute  { /* sama seperti existing */ }
```

Perbedaan penting dari versi lama: `AiModel` sekarang punya kolom `provider` + `syncedAt`, jadi model list bisa di-refresh dari API provider dan tidak campur aduk antar provider.

## Provider Adapter Interface

```ts
// lib/ai-providers/types.ts
export interface AIProvider {
  id: "google" | "openrouter";
  defaultBaseUrl: string;
  listModels(apiKey: string, baseUrl?: string): Promise<{ modelId: string; name: string }[]>;
  call(opts: {
    apiKey: string;
    baseUrl?: string;
    modelId: string;
    prompt: string;
    imageData?: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<{ text: string; tokensUsed?: number }>;
}
```

### `google.ts`
- `call()`: pakai endpoint `generativelanguage.googleapis.com/v1beta/models/{modelId}:generateContent?key=...` — logic sama seperti `callProviderModel` cabang Gemini di `ai-router.ts` (image inline_data, temperature, maxOutputTokens).
- `listModels()`: `GET https://generativelanguage.googleapis.com/v1beta/models?key=...`, filter model yang support `generateContent` (cek field `supportedGenerationMethods`).

### `openrouter.ts`
- `defaultBaseUrl`: `https://openrouter.ai/api/v1`
- `call()`: `POST {baseUrl}/chat/completions`, format request identik OpenAI (`messages`, `model`, `temperature`, `max_tokens`). Tambahkan header `HTTP-Referer` dan `X-Title` (disarankan OpenRouter untuk attribution, opsional tapi bagus untuk rate-limit fairness).
- `listModels()`: `GET {baseUrl}/models` (endpoint publik, tidak perlu key) — response `data[]` berisi `id`, `name`, `context_length`, `pricing`. Simpan `id` sebagai `modelId`.

Catatan: karena OpenRouter API-compatible dengan OpenAI, adapter ini bisa dipakai juga untuk endpoint OpenAI-compatible lain (base URL custom) — cukup override `baseUrl` per key seperti pola lama.

## Sinkronisasi Model (yang jadi fokus utama task ini)

1. Endpoint `POST /api/ai-models/sync` — parameter `provider` opsional (kalau kosong, sync semua provider yang punya key aktif).
2. Ambil satu API key aktif per provider (yang priority tertinggi), panggil `listModels()`.
3. Upsert ke tabel `AiModel` by `(provider, modelId)`; set `isActive: true`, `syncedAt: now()`.
4. Model yang sebelumnya ada tapi tidak muncul lagi di hasil sync → set `isActive: false` (jangan hapus, biar histori `AiRoute` tetap valid).
5. Jadwalkan sync otomatis (cron/`ScheduleWakeup` setara, atau tombol manual "Refresh Models" di Settings UI) — misal tiap 24 jam, karena daftar model provider berubah tidak sering.
6. Kalau sync gagal (network/key invalid), **jangan hapus model existing** — tetap pakai data lama + tampilkan warning di UI ("Model list terakhir sync: X jam lalu, gagal refresh").

Fallback hardcoded tetap dipertahankan (seperti `MODEL_FALLBACKS` di kode lama) hanya untuk kondisi tabel `AiModel` benar-benar kosong (first-run sebelum sync pertama berhasil).

## Halaman Settings (`/settings/ai-keys` atau serupa)

Fitur:
- List semua API key: alias, provider (badge Google/OpenRouter), status kesehatan (badge hijau/kuning/merah), priority, jumlah model allowed.
- Tombol **Tambah Key**: form pilih provider → input alias, API key (masked input), baseUrl (opsional, prefilled default per provider), priority.
- Setelah key ditambah → otomatis trigger `test` + `sync models` sekali supaya user langsung lihat model apa saja yang tersedia untuk key itu.
- Per key: toggle aktif/nonaktif, edit priority (drag-order atau input angka), tombol "Test Connection", tombol "Refresh Models", tombol hapus (konfirmasi).
- Bagian "Model Allowed": multi-select dari model yang sudah disinkron untuk provider itu (bukan free text) — supaya tidak ada typo model id.
- Panel kecil "Model tersedia per provider" (read-only) menampilkan hasil sync terakhir, dengan tombol "Sync All Now".

## Routing Logic (`lib/ai-router.ts`, generalisasi dari existing)

Tidak banyak berubah dari versi matik-in, hanya:
- `executeWithKey()` memanggil adapter sesuai `key.provider` (`google` | `openrouter`) via lookup `PROVIDERS[key.provider]`, bukan if/else provider string manual.
- `modelsToTry` diambil dari `AiModel` yang `provider === key.provider && isActive` (filter dengan `key.modelAllowed` kalau diisi), bukan hardcode per-provider seperti sebelumnya.
- Hardcoded fallback list per provider hanya dipakai kalau `AiModel` kosong untuk provider itu.

Sisanya (circuit breaker, cooldown, retry, `AiHealth`, `AiRoute` logging) tetap sama persis seperti `ai-router.ts` existing — sudah battle-tested, tidak perlu diubah.

## Keamanan

- API key tetap dienkripsi at-rest pakai pola `ai-key-crypto.ts` (AES, key dari env var, jangan pernah log/return plaintext ke client).
- Endpoint test/sync tidak boleh mengembalikan API key ke response — hanya status/hasil.
- Response GET key list hanya kirim alias + provider + status, bukan key terenkripsi sama sekali.

## Urutan Implementasi (bertahap, testable tiap step)

1. Migrasi schema: tambah kolom `provider` + `syncedAt` di `AiModel`, seed ulang data existing dengan `provider = "google"`.
2. Buat `lib/ai-providers/{types,google,openrouter}.ts`, pastikan `google.ts` hasil refactor 1:1 sama perilakunya dengan cabang Gemini di `callProviderModel` lama (regression check).
3. Refactor `ai-router.ts` untuk pakai adapter interface, hapus if/else provider string.
4. Endpoint `/api/ai-models/sync` + implementasi `listModels` tiap adapter.
5. Update `AiKeyManager.tsx` (atau bikin versi baru untuk app lain): tambah pilihan provider `openrouter`, multi-select model dari hasil sync, tombol sync manual.
6. Test end-to-end: tambah key Google, tambah key OpenRouter, cek prioritas & failover jalan saat salah satu key di-nonaktifkan/error.
7. Jadwalkan auto-sync model (cron harian) — opsional, bisa manual dulu di awal.

## Yang Sengaja Tidak Diubah dari Versi Lama

- Struktur `AiHealth` (circuit breaker threshold, cooldown duration) — sudah proven di production matik-in.
- Pola enkripsi key.
- Retry strategy (`MAX_RETRIES = 3`, skip ke model lain saat kena 429).



v2

# Plan Implementasi: Integrasi AI (Gemini + OpenRouter) — Multi-Key & Model Sync

Referensi untuk integrasi provider AI (Google Gemini, OpenRouter) yang konsisten antar provider, dengan dukungan multi-API-key dan daftar model yang selalu sinkron dengan yang tersedia di masing-masing provider.

## 1. State Saat Ini

**File terkait:**
- `app/Services/AIManager.php` — router utama: provider defs, key storage (encrypted), auto-failover.
- `app/Http/Controllers/ApiController.php` — endpoint settings (`getAISettings`, `saveAISettings`, `testAIProviders`, `deleteAIKey`) + **implementasi Gemini terpisah** (baris ~198–290) yang jalan duluan sebelum fallback ke `AIManager::call()`.
- `frontend/index.html` (`SettingsModule`, baris ~4380–4580) — render kartu provider, input key, save/test/delete.
- `storage/app/ai_keys.json` — key tersimpan terenkripsi AES-256-CBC.

**Gap yang ditemukan:**

1. **Multi-key tidak konsisten.** Hanya Gemini yang punya `multiKey: true, maxKeys: 5` di `getProviderDefs()`. OpenRouter dan OpenAI cuma single key — padahal OpenRouter juga sering butuh multi-key untuk rotasi rate-limit.
2. **Dua jalur pemanggilan Gemini.** `ApiController` punya logic Gemini sendiri (baris 198–290) yang terpisah dari `AIManager::callGemini()` — model list dan urutan retry bisa drift antara dua tempat ini.
3. **Model list hardcoded & statis.** `getProviderDefs()['models']` di-hardcode di kode. Kalau Google atau OpenRouter menambah/mengganti model, list ini jadi basi — tidak ada mekanisme sync ke model yang benar-benar tersedia untuk API key tersebut.
4. **`testAIProviders()` override khusus Gemini** (baris 1321–1388 `ApiController`) — testing OpenRouter tetap lewat `AIManager::testAllProviders()` generik, jadi behavior test tidak simetris.

## 2. Tujuan

- Halaman Settings mendukung **>1 API key** untuk Google Gemini **dan** OpenRouter dengan UI & flow yang sama persis (bukan cuma Gemini).
- Model yang muncul di dropdown/label per provider **sinkron dengan model yang benar-benar tersedia** — di-fetch dari provider, bukan hardcoded, dengan fallback ke list statis kalau fetch gagal.
- Satu jalur pemanggilan AI (hilangkan duplikasi logic Gemini di `ApiController`) — semua lewat `AIManager`.
- Testing key konsisten untuk semua provider (per-key status, bukan cuma agregat).

## 3. Perubahan Skema Data

`ai_keys.json` (setelah decrypt) — semua provider jadi array, seragam:

```json
{
  "gemini": ["AIzaSy...", "AIzaSy..."],
  "openrouter": ["sk-or-v1-...", "sk-or-v1-..."],
  "openai": ["sk-..."]
}
```

Migrasi: `AIManager::getKeysForProvider()` sudah handle `is_array($val) ? $val : [$val]` — jadi data lama (string tunggal) tetap kebaca, tidak perlu migration script.

Tambahan file cache model (baru): `storage/app/ai_models_cache.json`

```json
{
  "gemini": { "fetchedAt": "2026-09-27T10:00:00Z", "models": ["gemini-flash-latest", "..."] },
  "openrouter": { "fetchedAt": "2026-09-27T10:00:00Z", "models": ["google/gemini-2.0-flash", "..."] }
}
```

## 4. Perubahan Backend

### 4.1 `AIManager::getProviderDefs()`
- Set `multiKey: true, maxKeys: 5` untuk **openrouter** juga (samakan dengan gemini). OpenAI tetap single key kecuali diminta lain (dipakai jarang, prioritas terakhir).

### 4.2 Endpoint baru: sync model per provider
- `AIManager::fetchAvailableModels(string $providerId, string $apiKey): array`
  - Gemini: `GET https://generativelanguage.googleapis.com/v1beta/models?key={key}` → filter model yang support `generateContent`.
  - OpenRouter: `GET https://openrouter.ai/api/v1/models` (public, tidak butuh key valid untuk list, tapi tetap kirim key kalau ada) → ambil `id` field.
  - Simpan hasil ke `ai_models_cache.json` dengan TTL (misal 24 jam).
- Endpoint HTTP baru di `ApiController`: `POST /settings/ai/sync-models` `{ provider }` → panggil `fetchAvailableModels()`, update cache, return list model terbaru untuk provider itu.
- `getProviderDefs()` saat dipanggil dari `getAISettings()` di-merge dengan cache (kalau ada & belum expired) sebagai `models`, fallback ke hardcoded list kalau cache kosong/expired dan fetch gagal.

### 4.3 Hapus duplikasi Gemini di `ApiController`
- Ganti pemanggilan Gemini inline (baris ~198–290) supaya lewat `AIManager::call()` saja. Cukup pastikan `AIManager::callGemini()` sudah cover semua behavior yang dibutuhkan (retry, MAX_TOKENS skip, image support) — sudah ada, tinggal redirect pemanggilnya.
- `testAIProviders()`: hapus override khusus Gemini, pindahkan logic per-key test (dengan pesan error granular: 403 project belum aktif, 429 rate limit, dst) ke `AIManager::testAllProviders()` supaya berlaku generik untuk semua provider yang butuh pesan error detail per key — bukan cuma agregat ok/error.

### 4.4 `testAllProviders()` — per-key detail
- Ubah return shape supaya include breakdown per key (bukan cuma jumlah `workingKeys/totalKeys`), field tambahan: `perKey: [{ index, status, message }]`. Dipakai UI untuk tandai key mana yang gagal, bukan cuma provider mana.

## 5. Perubahan Frontend (`SettingsModule`)

- Loop render kartu provider (baris ~4395) sudah generik berdasarkan `def.multiKey` — **tidak perlu ubah struktur**, cukup pastikan backend kirim `multiKey: true` untuk openrouter supaya otomatis dapat N input key seperti Gemini.
- `saveKeys()` (baris ~4499): generalisasi loop yang sekarang hardcoded `for (let ki = 0; ki < 5; ki++)` khusus `key-gemini-*` — jadikan loop generik per provider yang `multiKey`, pakai `def.maxKeys` dari response, bukan angka 5 hardcode. Provider non-multiKey (openai) tetap pakai jalur single key yang sudah ada.
- Tambah tombol **"Sync Model"** per kartu provider → panggil `POST /settings/ai/sync-models` → refresh label `Models: ...` tanpa reload halaman.
- `testProviders()`: render breakdown per key (pakai `perKey` dari response 4.4) — tampilkan key mana yang aktif/gagal, bukan cuma total.

## 6. Urutan Implementasi

1. Backend: generalize `getProviderDefs()` (`multiKey` untuk openrouter) — perubahan kecil, langsung testable lewat UI existing.
2. Frontend: generalize `saveKeys()` loop supaya tidak hardcode ke gemini — pakai `maxKeys` dari `def`.
3. Backend: tambah `fetchAvailableModels()` + endpoint sync + cache file.
4. Frontend: tombol sync model + render list model ter-update.
5. Backend: redirect pemanggilan Gemini di `ApiController` ke `AIManager::call()`, hapus logic inline.
6. Backend: `testAllProviders()` per-key detail + hapus override Gemini khusus di `testAIProviders()`.
7. Frontend: render breakdown per-key di hasil test.

## 7. Verifikasi

- Isi 2+ key OpenRouter di settings → save → cek `ai_keys.json` (encrypted, tapi decrypt lewat `AIManager::loadKeys()` di tinker) jadi array.
- Trigger rate-limit pada key OpenRouter pertama (test dengan key invalid) → pastikan `AIManager::call()` pindah ke key kedua, bukan langsung fallback ke OpenAI.
- Sync model OpenRouter → pastikan list model di UI berubah sesuai response API terbaru, tidak lagi 3 model hardcoded.
- Regression: alur existing yang manggil AI (topic generation, dll di `ApiController` baris 1399+) tetap jalan setelah Gemini inline logic dihapus.
