"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { PanelRightOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useLive } from "@/components/realtime/LiveProvider";
import type { RadahnUIMessage } from "@/lib/chat-types";
import { CHAT_MODELS, DEFAULT_CHAT_MODEL, type ChatModelId } from "@/lib/models";
import { cn } from "@/lib/utils";
import { Composer } from "./Composer";
import { EmptyState } from "./EmptyState";
import { MemoryLens, type GhostState } from "./MemoryLens";
import { AssistantMessage, UserMessage } from "./MessageItem";
import { dataPart, dataParts, messageText } from "./parts";
import { PendingSaves } from "./PendingSaves";

/** Model choice persists per browser; server snapshot is the default so hydration matches. */
const MODEL_KEY = "radahn-model";
const modelListeners = new Set<() => void>();
function readModel(): ChatModelId {
  try {
    const v = localStorage.getItem(MODEL_KEY);
    return CHAT_MODELS.some((m) => m.id === v) ? (v as ChatModelId) : DEFAULT_CHAT_MODEL;
  } catch {
    return DEFAULT_CHAT_MODEL;
  }
}
function writeModel(m: ChatModelId) {
  try {
    localStorage.setItem(MODEL_KEY, m);
  } catch {
    /* private mode */
  }
  modelListeners.forEach((l) => l());
}
function subscribeModel(l: () => void) {
  modelListeners.add(l);
  return () => modelListeners.delete(l);
}

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
  // Replies loaded from history never show the "saving" indicator — only ones produced now.
  const [historyIds] = useState(() => new Set(initialMessages.map((m) => m.id)));
  const scroller = useRef<HTMLDivElement>(null);
  const model = useSyncExternalStore(subscribeModel, readModel, () => DEFAULT_CHAT_MODEL);
  const modelRef = useRef(model);
  useEffect(() => {
    modelRef.current = model;
  }, [model]);
  const live = useLive();

  const transport = useMemo(
    () =>
      new DefaultChatTransport<RadahnUIMessage>({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            message: messages[messages.length - 1],
            conversationId: conversationIdRef.current ?? undefined,
            spaceId,
            model: modelRef.current,
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
  const latestUser = [...messages].reverse().find((m) => m.role === "user");
  const userBefore = selectedIdx > 0 ? [...messages.slice(0, selectedIdx)].reverse().find((m) => m.role === "user") : undefined;

  // Open a conversation at its latest message, like any chat app.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

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
      notices={selected ? dataParts(selected, "notice") : []}
      onClose={() => {
        setLensOpen(false);
        setMobileLens(false);
      }}
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
        <header className="flex h-14 items-center gap-3 border-b border-line px-4 md:px-5">
          <h1 className="truncate text-[15px] font-medium text-ink">{messages.length ? title : "New chat"}</h1>
          <span className="hidden h-7 items-center rounded-full bg-hover px-3 text-[12.5px] text-ink-2 sm:inline-flex">{spaceName}</span>
          {isDemoConversation ? <span className="text-[12.5px] text-ink-3">Demo</span> : null}
          <span className="flex-1" />
          <button
            onClick={() => {
              setLensOpen(true);
              setMobileLens(true);
            }}
            className={cn(
              "flex h-9 items-center gap-2 rounded-full px-3 text-[13.5px] text-ink-2 shadow-[inset_0_0_0_1px_var(--line-strong)] hover:bg-hover hover:text-ink",
              lensOpen && "lg:hidden",
            )}
            aria-label="Show memory panel"
            title="Show memory panel (Ctrl/Cmd + .)"
          >
            <PanelRightOpen className="size-4" strokeWidth={1.75} />
            Memory
            {latestAssistant && dataPart(latestAssistant, "recall")?.picks?.length ? (
              <span className="tabular text-ink-3">{dataPart(latestAssistant, "recall")!.picks!.length}</span>
            ) : null}
          </button>
        </header>

        <div ref={scroller} className="relative min-h-0 flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <EmptyState suggestions={suggestions} showDemo={showDemo} onPick={(s) => setPrefill(s)} />
          ) : (
            <div className="mx-auto flex w-full max-w-[760px] flex-col gap-7 px-4 pb-10 pt-8 md:px-6">
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
                    isLatest={m.id === latestAssistant?.id && !historyIds.has(m.id)}
                  />
                ),
              )}
              {status === "submitted" && messages.at(-1)?.role === "user" ? (
                <p className="shimmer text-[14px]">Remembering…</p>
              ) : null}
              {error ? (
                <div role="alert" className="rounded-card bg-surface p-4 text-[13px] text-ink-2 shadow-card">
                  <p className="mb-1 text-[13px] font-medium text-red">Reply failed</p>
                  {/rate|busy|429|quota|fast/i.test(error.message) ? error.message : "Something went wrong getting that reply. Your memory is fine."}
                  <button onClick={() => void regenerate()} className="ml-3 text-[13px] font-medium text-ink underline-offset-4 hover:underline">
                    Retry
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="mx-auto w-full max-w-[800px] px-3 pb-3 md:px-6 md:pb-5">
          {!busy && latestUser ? <PendingSaves events={live.forMessage(latestUser.id)} /> : null}
          <Composer key={prefill ?? "composer"} onSend={send} onStop={stop} busy={busy} initial={prefill} model={model} onModel={writeModel} />
        </div>
      </section>

      {lensOpen ? <div className="relative hidden w-[380px] shrink-0 border-l border-line lg:block">{lens}</div> : null}
      {mobileLens ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Memory">
          <button className="absolute inset-0 bg-black/40" aria-label="Close memory panel" onClick={() => setMobileLens(false)} />
          <div className="absolute inset-x-0 bottom-0 h-[78dvh] animate-fade-up overflow-hidden rounded-t-[18px] shadow-overlay">{lens}</div>
        </div>
      ) : null}
    </div>
  );
}
