"use client";

import { useRouter } from "next/navigation";
import { useActionState, useMemo, useState } from "react";
import { Pencil, Plus, RefreshCw, Trash2, Zap } from "lucide-react";
import {
  createAiKeyAction,
  deleteAiKeyAction,
  syncAiModelsAction,
  testAiKeyAction,
  toggleAiKeyAction,
  updateAiKeyAction,
} from "@/app/actions/ai-keys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { idleState } from "@/lib/form";
import { useActionToast } from "@/lib/hooks/use-action-toast";

export type ProviderId = "9router" | "google" | "openrouter";

export type KeyRowData = {
  id: number;
  alias: string;
  provider: ProviderId;
  keyHint: string | null;
  baseUrl: string | null;
  modelAllowed: string[] | null;
  priority: number;
  isActive: boolean;
  healthStatus: "healthy" | "cooldown" | "disabled";
  cooldownUntil: Date | null;
  lastErrorMessage: string | null;
};

export type ModelOption = {
  provider: ProviderId;
  modelId: string;
  name: string;
  isActive: boolean;
};

export type ProviderMeta = { id: ProviderId; label: string; defaultBaseUrl: string };

const HEALTH: Record<KeyRowData["healthStatus"], { label: string; variant: "success" | "warning" | "outline" }> = {
  healthy: { label: "Sehat", variant: "success" },
  cooldown: { label: "Cooldown", variant: "warning" },
  disabled: { label: "Nonaktif", variant: "outline" },
};

/**
 * The stored status stays "cooldown" after the window lapses — routing already
 * retries the key again — so the timestamp is what the badge has to trust.
 */
function effectiveHealth(row: KeyRowData): KeyRowData["healthStatus"] {
  if (!row.isActive) return "disabled";
  if (row.healthStatus !== "cooldown") return row.healthStatus;
  return row.cooldownUntil && row.cooldownUntil.getTime() > Date.now() ? "cooldown" : "healthy";
}

function providerLabel(providers: ProviderMeta[], id: ProviderId): string {
  return providers.find((item) => item.id === id)?.label ?? id;
}

function ModelPicker({
  models,
  selected,
  onToggle,
  emptyHint,
}: {
  models: ModelOption[];
  selected: string[];
  onToggle: (modelId: string, checked: boolean) => void;
  emptyHint: string;
}) {
  if (models.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">{emptyHint}</p>
    );
  }

  return (
    <ScrollArea className="h-44 rounded-lg border border-border">
      <div className="flex flex-col gap-1 p-2">
        {models.map((model) => (
          <label
            key={model.modelId}
            className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
          >
            <Checkbox
              checked={selected.includes(model.modelId)}
              onCheckedChange={(value) => onToggle(model.modelId, value === true)}
            />
            <span className="min-w-0 flex-1 truncate">{model.name}</span>
            <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{model.modelId}</span>
          </label>
        ))}
      </div>
    </ScrollArea>
  );
}

function AddKeyForm({ providers, models }: { providers: ProviderMeta[]; models: ModelOption[] }) {
  const router = useRouter();
  const [state, action] = useActionState(createAiKeyAction, idleState);
  const [provider, setProvider] = useState<ProviderId>(providers[0]?.id ?? "google");
  const [allowed, setAllowed] = useState<string[]>([]);
  const [formKey, setFormKey] = useState(0);
  const errors = state.fieldErrors ?? {};

  useActionToast(state, () => {
    setAllowed([]);
    setFormKey((value) => value + 1);
    router.refresh();
  });

  const providerModels = useMemo(() => models.filter((model) => model.provider === provider), [models, provider]);
  const baseUrl = providers.find((item) => item.id === provider)?.defaultBaseUrl ?? "";

  const toggleAllowed = (modelId: string, checked: boolean) =>
    setAllowed((current) => (checked ? [...new Set([...current, modelId])] : current.filter((id) => id !== modelId)));

  return (
    <form key={formKey} action={action} className="flex flex-col gap-4">
      {state.message && !state.ok ? <FormAlert tone="error">{state.message}</FormAlert> : null}

      <input type="hidden" name="modelAllowed" value={JSON.stringify(allowed)} />

      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Provider" error={errors.provider} required>
            <Select
              name="provider"
              value={provider}
              onValueChange={(value) => {
                setProvider(value as ProviderId);
                setAllowed([]);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {providers.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Nama key" htmlFor="ai-alias" hint="Bebas, untuk membedakan antar key." error={errors.alias} required>
            <Input id="ai-alias" name="alias" maxLength={120} placeholder="Google utama" required />
          </Field>
        </div>

        <Field
          label="API key"
          htmlFor="ai-key"
          hint="Disimpan terenkripsi dan tidak pernah ditampilkan lagi."
          error={errors.apiKey}
          required
        >
          <Input id="ai-key" name="apiKey" type="password" autoComplete="off" maxLength={400} placeholder="Tempel API key provider" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Base URL" htmlFor="ai-base-url" hint={`Kosongkan untuk ${baseUrl}.`} error={errors.baseUrl}>
            <Input key={provider} id="ai-base-url" name="baseUrl" defaultValue={baseUrl} maxLength={300} />
          </Field>

          <Field label="Prioritas" htmlFor="ai-priority" hint="Angka kecil dicoba lebih dulu." error={errors.priority}>
            <Input id="ai-priority" name="priority" type="number" min={1} max={999} defaultValue={100} />
          </Field>
        </div>

        <Field
          label="Model yang diizinkan"
          hint="Dicentang dipakai berurutan sesuai urutan memilih. Kosong berarti memakai maksimal 3 model tersinkron pertama."
          error={errors.modelAllowed}
        >
          <ModelPicker
            models={providerModels}
            selected={allowed}
            onToggle={toggleAllowed}
            emptyHint={`Belum ada model ${providerLabel(providers, provider)} yang tersinkron. Simpan key lalu jalankan "Sinkronkan semua".`}
          />
        </Field>
      </FieldGroup>

      <SubmitButton pendingLabel="Menyimpan…" className="self-start">
        <Plus />
        Tambah key
      </SubmitButton>
    </form>
  );
}

function EditKeyDialog({
  row,
  providers,
  models,
  onClose,
}: {
  row: KeyRowData;
  providers: ProviderMeta[];
  models: ModelOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, action] = useActionState(updateAiKeyAction, idleState);
  const [allowed, setAllowed] = useState<string[]>(row.modelAllowed ?? []);
  const errors = state.fieldErrors ?? {};

  useActionToast(state, () => {
    onClose();
    router.refresh();
  });

  const providerModels = models.filter((model) => model.provider === row.provider);
  const toggleAllowed = (modelId: string, checked: boolean) =>
    setAllowed((current) => (checked ? [...new Set([...current, modelId])] : current.filter((id) => id !== modelId)));

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent>
        <form action={action} className="flex min-h-0 flex-col">
          <input type="hidden" name="id" value={row.id} />
          <input type="hidden" name="provider" value={row.provider} />
          <input type="hidden" name="modelAllowed" value={JSON.stringify(allowed)} />

          <DialogHeader>
            <DialogTitle>Ubah {row.alias}</DialogTitle>
            <DialogDescription>{providerLabel(providers, row.provider)}</DialogDescription>
          </DialogHeader>

          <DialogBody className="flex flex-col gap-4">
            {state.message && !state.ok ? <FormAlert tone="error">{state.message}</FormAlert> : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nama key" htmlFor={`alias-${row.id}`} error={errors.alias} required>
                <Input id={`alias-${row.id}`} name="alias" defaultValue={row.alias} maxLength={120} required />
              </Field>
              <Field label="Prioritas" htmlFor={`priority-${row.id}`} error={errors.priority}>
                <Input
                  id={`priority-${row.id}`}
                  name="priority"
                  type="number"
                  min={1}
                  max={999}
                  defaultValue={row.priority}
                />
              </Field>
            </div>

            <Field
              label="API key baru"
              htmlFor={`apiKey-${row.id}`}
              hint="Biarkan kosong untuk mempertahankan key yang sekarang."
              error={errors.apiKey}
            >
              <Input
                id={`apiKey-${row.id}`}
                name="apiKey"
                type="password"
                autoComplete="off"
                maxLength={400}
                placeholder="••••••••"
              />
            </Field>

            <Field label="Base URL" htmlFor={`baseUrl-${row.id}`} error={errors.baseUrl}>
              <Input id={`baseUrl-${row.id}`} name="baseUrl" defaultValue={row.baseUrl ?? ""} maxLength={300} />
            </Field>

            <Field
              label="Model yang diizinkan"
              hint="Dicentang dipakai berurutan sesuai urutan memilih. Kosong berarti maksimal 3 model tersinkron pertama."
              error={errors.modelAllowed}
            >
              <ModelPicker
                models={providerModels}
                selected={allowed}
                onToggle={toggleAllowed}
                emptyHint="Belum ada model tersinkron untuk provider ini."
              />
            </Field>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Batal
            </Button>
            <SubmitButton pendingLabel="Menyimpan…">Simpan</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteKeyDialog({ row, onClose }: { row: KeyRowData; onClose: () => void }) {
  const router = useRouter();
  const [state, action] = useActionState(deleteAiKeyAction, idleState);

  useActionToast(state, () => {
    onClose();
    router.refresh();
  });

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent>
        <form action={action} className="flex min-h-0 flex-col">
          <input type="hidden" name="id" value={row.id} />

          <DialogHeader>
            <DialogTitle>Hapus {row.alias}?</DialogTitle>
            <DialogDescription>
              Key beserta riwayat modelnya dihapus dari database. Tindakan ini tidak bisa dibatalkan.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              Batal
            </Button>
            <SubmitButton variant="destructive" pendingLabel="Menghapus…">
              <Trash2 />
              Hapus
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function KeyRow({
  row,
  providers,
  onEdit,
  onDelete,
}: {
  row: KeyRowData;
  providers: ProviderMeta[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const router = useRouter();
  const [toggleState, toggleAction] = useActionState(toggleAiKeyAction, idleState);
  const [testState, testAction] = useActionState(testAiKeyAction, idleState);

  useActionToast(toggleState, () => router.refresh());
  useActionToast(testState, () => router.refresh());

  const health = HEALTH[effectiveHealth(row)];

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{row.alias}</span>
        <Badge variant="secondary" className="text-[10px]">
          {providerLabel(providers, row.provider)}
        </Badge>
        <Badge variant={health.variant} className="text-[10px]">
          {health.label}
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          Prioritas {row.priority}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="font-mono">{row.keyHint ?? "••••"}</span>
        <span className="min-w-0 truncate">{row.baseUrl ?? "—"}</span>
        <span>{row.modelAllowed?.length ? `${row.modelAllowed.length} model dipilih` : "Model otomatis (maks 3)"}</span>
      </div>

      {row.lastErrorMessage ? (
        <p className="rounded-md bg-destructive/10 px-2 py-1.5 text-xs text-destructive">{row.lastErrorMessage}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <form action={toggleAction}>
          <input type="hidden" name="id" value={row.id} />
          <input type="hidden" name="isActive" value={row.isActive ? "false" : "true"} />
          <SubmitButton variant="outline" size="sm" pendingLabel="…">
            {row.isActive ? "Nonaktifkan" : "Aktifkan"}
          </SubmitButton>
        </form>

        <form action={testAction}>
          <input type="hidden" name="id" value={row.id} />
          <SubmitButton variant="outline" size="sm" pendingLabel="Menguji…">
            <Zap />
            Uji koneksi
          </SubmitButton>
        </form>

        <Button type="button" variant="outline" size="sm" onClick={onEdit}>
          <Pencil />
          Ubah
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="ml-auto text-muted-foreground hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 />
          Hapus
        </Button>
      </div>

      {testState.message ? (
        <p className={testState.ok ? "text-xs text-success" : "text-xs text-destructive"}>{testState.message}</p>
      ) : null}
    </div>
  );
}

function SyncPanel({ providers, models }: { providers: ProviderMeta[]; models: ModelOption[] }) {
  const router = useRouter();
  const [state, action] = useActionState(syncAiModelsAction, idleState);

  useActionToast(state, () => router.refresh());

  return (
    <Card>
      <CardHeader>
        <CardTitle>Model tersedia</CardTitle>
        <CardDescription>Diambil langsung dari provider. Sinkronkan setelah menambah key baru.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {state.message && !state.ok ? <FormAlert tone="error">{state.message}</FormAlert> : null}

        <div className="flex flex-wrap gap-2">
          <form action={action}>
            <SubmitButton variant="outline" size="sm" pendingLabel="Menyinkronkan…">
              <RefreshCw />
              Sinkronkan semua
            </SubmitButton>
          </form>
          {providers.map((provider) => (
            <form key={provider.id} action={action}>
              <input type="hidden" name="provider" value={provider.id} />
              <SubmitButton variant="ghost" size="sm" className="text-muted-foreground" pendingLabel="…">
                {provider.label}
              </SubmitButton>
            </form>
          ))}
        </div>

        {providers.map((provider) => {
          const rows = models.filter((model) => model.provider === provider.id);
          return (
            <div key={provider.id} className="flex flex-col gap-1.5">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {provider.label} · {rows.length}
              </p>
              {rows.length === 0 ? (
                <p className="text-xs text-muted-foreground">Belum ada model tersinkron.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {rows.map((model) => (
                    <Badge
                      key={model.modelId}
                      variant={model.isActive ? "outline" : "destructive"}
                      className="font-mono text-[10px]"
                    >
                      {model.modelId}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function AiKeysManager({
  keys,
  models,
  providers,
}: {
  keys: KeyRowData[];
  models: ModelOption[];
  providers: ProviderMeta[];
}) {
  const [editing, setEditing] = useState<KeyRowData | null>(null);
  const [deleting, setDeleting] = useState<KeyRowData | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Tambah API key</CardTitle>
          <CardDescription>
            Key disimpan terenkripsi di database. Key dengan prioritas terkecil dipakai lebih dulu; bila gagal, sistem
            mencoba key berikutnya secara otomatis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddKeyForm providers={providers} models={models} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API key terdaftar</CardTitle>
          <CardDescription>
            {keys.length === 0
              ? "Belum ada key. Fitur AI memakai konfigurasi environment sampai key ditambahkan."
              : `${keys.filter((row) => row.isActive).length} dari ${keys.length} key aktif.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada key terdaftar.</p>
          ) : (
            keys.map((row) => (
              <KeyRow
                key={row.id}
                row={row}
                providers={providers}
                onEdit={() => setEditing(row)}
                onDelete={() => setDeleting(row)}
              />
            ))
          )}
        </CardContent>
      </Card>

      <SyncPanel providers={providers} models={models} />

      {editing ? (
        <EditKeyDialog
          key={`edit-${editing.id}`}
          row={editing}
          providers={providers}
          models={models}
          onClose={() => setEditing(null)}
        />
      ) : null}

      {deleting ? (
        <DeleteKeyDialog key={`delete-${deleting.id}`} row={deleting} onClose={() => setDeleting(null)} />
      ) : null}
    </div>
  );
}
