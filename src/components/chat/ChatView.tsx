"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { PanelRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Kbd } from "@/components/atoms";
import type { RadahnUIMessage } from "@/lib/chat-types";
import { cn } from "@/lib/utils";
import { Composer } from "./Composer";
import { EmptyState } from "./EmptyState";
import { MemoryLens, type GhostState } from "./MemoryLens";
import { AssistantMessage, UserMessage } from "./MessageItem";
import { dataPart, messageText } from "./parts";

export function ChatView({
  conversationId: initialConversationId,
  title,
  spaceId,
  spaceName,
  initialMessages,
  suggestions,
  showDemo,
  isDemoConversation,
}: {
  conversationId: string | null;
  title: string;
  spaceId: string;
  spaceName: string;
  initialMessages: RadahnUIMessage[];
  suggestions: string[];
  showDemo: boolean;
  isDemoConversation?: boolean;
}) {
  const router = useRouter();
  const conversationIdRef = useRef<string | null>(initialConversationId);
  const [lensOpen, setLensOpen] = useState(true);
  const [mobileLens, setMobileLens] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<"recalled" | "written" | "trace" | "ghost">("recalled");
  const [ghosts, setGhosts] = useState<Record<string, GhostState>>({});
  const [prefill, setPrefill] = useState<string | undefined>();
  const scroller = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport<RadahnUIMessage>({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            message: messages[messages.length - 1],
            conversationId: conversationIdRef.current ?? undefined,
            spaceId,
          },
        }),
      }),
    [spaceId],
  );

  const { messages, sendMessage, status, stop, error, regenerate } = useChat<RadahnUIMessage>({
    id: initialConversationId ?? undefined,
    messages: initialMessages,
    transport,
    onData: (part) => {
      if (part.type === "data-turn" && !conversationIdRef.current) {
        conversationIdRef.current = part.data.conversationId;
        // Update the URL without remounting (the stream is still running).
        window.history.replaceState(null, "", `/app/chat/${part.data.conversationId}`);
      }
    },
    onFinish: () => router.refresh(),
  });

  const busy = status === "submitted" || status === "streaming";
  const assistants = messages.filter((m) => m.role === "assistant");
  const latestAssistant = assistants.at(-1);
  const selected = messages.find((m) => m.id === selectedId) ?? latestAssistant;
  const selectedIdx = selected ? messages.indexOf(selected) : -1;
  const userBefore = selectedIdx > 0 ? [...messages.slice(0, selectedIdx)].reverse().find((m) => m.role === "user") : undefined;

  // Follow the newest reply while streaming.
  useEffect(() => {
    if (!busy) return;
    setSelectedId(null);
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages, busy]);

  // ⌘. toggles the lens (design.md §6).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ".") {
        e.preventDefault();
        setLensOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const send = useCallback((text: string) => void sendMessage({ text }), [sendMessage]);

  const runGhost = useCallback(async (assistantId: string) => {
    setSelectedId(assistantId);
    setTab("ghost");
    setLensOpen(true);
    setMobileLens(true);
    setGhosts((g) => ({ ...g, [assistantId]: { status: "loading" } }));
    try {
      const r = await fetch("/api/chat/ghost", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messageId: assistantId }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error?.message ?? "Couldn't get the ghost answer.");
      setGhosts((g) => ({ ...g, [assistantId]: { status: "done", text: j.text, model: j.model } }));
    } catch (e) {
      setGhosts((g) => ({ ...g, [assistantId]: { status: "error", error: (e as Error).message } }));
    }
  }, []);

  const lens = (
    <MemoryLens
      recall={selected ? dataPart(selected, "recall") : undefined}
      assistantId={selected?.id}
      userMessageId={userBefore?.id}
      replyText={selected ? messageText(selected) : ""}
      ghost={(selected && ghosts[selected.id]) || { status: "idle" }}
      tab={tab}
      onTab={setTab}
    />
  );

  return (
    <div className="flex min-h-0 flex-1">
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 items-center gap-3 border-b border-line px-4">
          <h1 className="truncate text-[13.5px] text-ink">{messages.length ? title : "New chat"}</h1>
          <span className="mono-label hidden h-6 items-center rounded-full bg-hover px-2.5 text-[10px] text-ink-2 sm:inline-flex">{spaceName}</span>
          {isDemoConversation ? <span className="mono-label text-[10px] text-ink-3">Demo</span> : null}
          <span className="flex-1" />
          <button
            onClick={() => {
              setLensOpen((o) => !o);
              setMobileLens((o) => !o);
            }}
            className="flex items-center gap-2 rounded-control px-2 py-1.5 text-ink-2 hover:bg-hover hover:text-ink"
            aria-pressed={lensOpen}
            aria-label="Toggle memory lens"
          >
            <PanelRight className="size-4" strokeWidth={1.75} />
            <Kbd className="hidden lg:inline-flex">⌘ .</Kbd>
          </button>
        </header>

        <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <EmptyState suggestions={suggestions} showDemo={showDemo} onPick={(s) => setPrefill(s)} />
          ) : (
            <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-4 pb-10 pt-8">
              {messages.map((m, i) =>
                m.role === "user" ? (
                  <UserMessage key={m.id} message={m} />
                ) : (
                  <AssistantMessage
                    key={m.id}
                    message={m}
                    userMessageId={[...messages.slice(0, i)].reverse().find((x) => x.role === "user")?.id}
                    selected={selected?.id === m.id && assistants.length > 1}
                    onSelect={() => setSelectedId(m.id)}
                    onOpenMemory={(id) => router.push(`/app/memory/${id}`)}
                    onGhost={busy ? undefined : () => runGhost(m.id)}
                    onRetry={m.id === latestAssistant?.id && !busy ? () => void regenerate() : undefined}
                    streaming={busy && m.id === latestAssistant?.id}
                    isLatest={m.id === latestAssistant?.id}
                  />
                ),
              )}
              {status === "submitted" && messages.at(-1)?.role === "user" ? (
                <p className="mono-label shimmer text-[10.5px]">Recalling…</p>
              ) : null}
              {error ? (
                <div role="alert" className="rounded-card bg-surface p-4 text-[13px] text-ink-2 shadow-card">
                  <p className="mono-label mb-1 text-[10.5px] text-red">Reply failed</p>
                  {/rate|busy|429|quota|fast/i.test(error.message) ? error.message : "Something went wrong getting that reply. Your memory is fine."}
                  <button onClick={() => void regenerate()} className="mono-label ml-3 text-[10.5px] text-ink underline-offset-4 hover:underline">
                    Retry
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="mx-auto w-full max-w-[760px] px-4 pb-4">
          <Composer key={prefill ?? "composer"} onSend={send} onStop={stop} busy={busy} initial={prefill} />
        </div>
      </section>

      {lensOpen ? <div className="hidden w-[360px] shrink-0 border-l border-line lg:block">{lens}</div> : null}
      {mobileLens ? (
        <div className={cn("fixed inset-x-0 bottom-0 z-40 h-[70dvh] animate-fade-up rounded-t-[16px] shadow-overlay lg:hidden")}>
          <div className="h-full overflow-hidden rounded-t-[16px]">
            <MemoryLensMobile onClose={() => setMobileLens(false)}>{lens}</MemoryLensMobile>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MemoryLensMobile({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="relative h-full">
      <button onClick={onClose} className="mono-label absolute right-3 top-2.5 z-10 rounded-full bg-grove-2 px-3 py-1 text-[10px] text-grove-ink">
        Close
      </button>
      {children}
    </div>
  );
}
