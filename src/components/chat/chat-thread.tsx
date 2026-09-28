"use client";

import {
  Check,
  Copy,
  Download,
  FileText,
  KeyRound,
  ListChecks,
  NotebookText,
  Paperclip,
  Pencil,
  Send,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { sendChatMessageAction } from "@/app/actions/ai-chat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { idleState } from "@/lib/form";
import { useActionToast } from "@/lib/hooks/use-action-toast";
import { cn } from "@/lib/utils";

type ChatMessage = { id: number; role: "user" | "assistant"; content: string; createdAt: string };

const QUICK_ACTIONS: { text: string; icon: typeof ListChecks; needsQuestions?: boolean }[] = [
  { text: "Cek apakah semua materi sudah masuk.", icon: ListChecks, needsQuestions: true },
  { text: "Revisi yang kurang.", icon: Pencil, needsQuestions: true },
  { text: "Buat kunci jawaban.", icon: KeyRound, needsQuestions: true },
  { text: "Buat Word.", icon: FileText, needsQuestions: true },
  { text: "Cek progress.", icon: TrendingUp },
  { text: "Buat laporan perkembangan bulan ini.", icon: NotebookText },
];

const EXAMPLE_PROMPTS = [
  "Buatkan STS kelas 3 dari rangkuman ini, 30 PG + 15 isian.",
  "Buatkan 10 soal pilihan ganda tentang pecahan.",
  "5 soal isian singkat tentang IPA, materi tata surya.",
];

const WORD_LINK_PATTERN = /\/api\/ai\/chat\/\d+\/export-word/;
const MAX_TEXTAREA_HEIGHT = 160;

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function AssistantAvatar() {
  return (
    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
      <Sparkles className="size-3.5" />
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label="Salin pesan"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // clipboard tidak tersedia — abaikan, bukan alur kritis
        }
      }}
      className="text-muted-foreground/70 transition-colors hover:text-foreground"
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
    </button>
  );
}

export function ChatThread({
  sessionId,
  initialMessages,
  attachableDocuments,
  hasQuestions,
}: {
  sessionId: number;
  initialMessages: ChatMessage[];
  attachableDocuments: { id: number; title: string }[];
  hasQuestions: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pickedDocs, setPickedDocs] = useState<Set<number>>(new Set());
  const [openAttach, setOpenAttach] = useState(false);
  const [optimisticMessage, setOptimisticMessage] = useState<string | null>(null);
  const [state, dispatch, isPending] = useActionState(sendChatMessageAction, idleState);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useActionToast(
    state,
    () => {
      setPickedDocs(new Set());
      setOptimisticMessage(null);
      router.refresh();
    },
    () => {
      setMessage((current) => current || optimisticMessage || "");
      setOptimisticMessage(null);
    },
  );

  const displayMessages: ChatMessage[] = optimisticMessage
    ? [...initialMessages, { id: -1, role: "user", content: optimisticMessage, createdAt: new Date().toISOString() }]
    : initialMessages;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [displayMessages.length, isPending]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [message]);

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isPending) return;
    const fd = new FormData();
    fd.set("sessionId", String(sessionId));
    fd.set("message", trimmed);
    fd.set("documentIds", JSON.stringify([...pickedDocs]));
    setOptimisticMessage(trimmed);
    setMessage("");
    startTransition(() => dispatch(fd));
  }

  function toggleDoc(id: number) {
    setPickedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 3) next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 pb-36">
        {displayMessages.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-2 py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="size-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Ngobrol aja, nggak perlu isi form</p>
              <p className="mt-1 text-xs text-muted-foreground">Coba salah satu contoh ini, atau tulis sendiri.</p>
            </div>
            <div className="flex w-full flex-col gap-2">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => submit(prompt)}
                  className="rounded-xl border border-border bg-card px-3.5 py-2.5 text-left text-xs text-foreground transition-colors hover:bg-muted/60"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          displayMessages.map((item) => {
            const wordLink = item.role === "assistant" ? item.content.match(WORD_LINK_PATTERN)?.[0] : null;
            const isUser = item.role === "user";
            return (
              <div key={item.id} className={cn("flex items-end gap-2", isUser ? "justify-end" : "justify-start")}>
                {!isUser ? <AssistantAvatar /> : null}
                <div className={cn("flex max-w-[80%] flex-col gap-1", isUser ? "items-end" : "items-start")}>
                  <div
                    className={cn(
                      "rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-line",
                      isUser
                        ? "rounded-br-sm bg-primary text-primary-foreground"
                        : "rounded-bl-sm bg-muted text-foreground",
                    )}
                  >
                    {item.content}
                    {wordLink ? (
                      <a
                        href={wordLink}
                        className="mt-2 flex items-center gap-1.5 rounded-lg bg-background/60 px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-background"
                      >
                        <Download className="size-3.5" />
                        Unduh file Word
                      </a>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1.5 px-1 text-[10px] text-muted-foreground">
                    <span>{timeLabel(item.createdAt)}</span>
                    {!isUser ? <CopyButton text={item.content} /> : null}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {isPending ? (
          <div className="flex items-end gap-2">
            <AssistantAvatar />
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60" />
            </div>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 safe-bottom border-t border-border bg-background">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 px-4 pt-2.5 pb-2">
          <div className="scrollbar-none flex gap-1.5 overflow-x-auto">
            {QUICK_ACTIONS.filter((action) => hasQuestions || !action.needsQuestions).map(({ text, icon: Icon }) => (
              <Button
                key={text}
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 shrink-0 bg-muted/60 text-[11px]"
                disabled={isPending}
                onClick={() => submit(text)}
              >
                <Icon className="size-3" />
                {text}
              </Button>
            ))}
          </div>

          {pickedDocs.size > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {[...pickedDocs].map((id) => {
                const doc = attachableDocuments.find((d) => d.id === id);
                if (!doc) return null;
                return (
                  <Badge key={id} variant="secondary" className="gap-1 text-[10px]">
                    {doc.title}
                    <button type="button" onClick={() => toggleDoc(id)} aria-label={`Lepas lampiran ${doc.title}`}>
                      <X className="size-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          ) : null}

          <div className="flex items-end gap-1 rounded-2xl border border-border bg-card py-1 pr-1 pl-1.5 shadow-xs transition-colors focus-within:border-primary/50">
            {attachableDocuments.length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="mb-0.5 shrink-0 text-muted-foreground"
                onClick={() => setOpenAttach(true)}
                aria-label="Lampirkan dokumen"
              >
                <Paperclip className="size-4" />
              </Button>
            ) : null}
            <Textarea
              ref={textareaRef}
              rows={1}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit(message);
                }
              }}
              placeholder="Tulis pesan…"
              className="min-h-8 flex-1 resize-none border-0 bg-transparent px-1 py-1.5 shadow-none outline-none focus-visible:outline-none"
            />
            <Button
              type="button"
              size="icon-sm"
              className="mb-0.5 shrink-0 rounded-full"
              disabled={isPending || message.trim().length === 0}
              onClick={() => submit(message)}
              aria-label="Kirim"
            >
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={openAttach} onOpenChange={setOpenAttach}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lampirkan dokumen</DialogTitle>
            <DialogDescription>Pilih sampai 3 dokumen (rangkuman, soal SH, foto buku, PDF) sebagai konteks.</DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-2">
            {attachableDocuments.map((doc) => (
              <label key={doc.id} className="flex items-center gap-2 rounded-lg border border-border p-2.5 text-sm">
                <Checkbox checked={pickedDocs.has(doc.id)} onCheckedChange={() => toggleDoc(doc.id)} />
                <span className="truncate">{doc.title}</span>
              </label>
            ))}
          </DialogBody>
          <DialogFooter>
            <Button type="button" onClick={() => setOpenAttach(false)}>
              Selesai
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
