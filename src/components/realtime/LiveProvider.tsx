"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

/** Mirrors MemoryEventDTO (server). Client-safe copy. */
export interface LiveEvent {
  id: string;
  spaceKey: string;
  memoryId?: string;
  kind: string;
  actor: { kind: string; name: string };
  type?: string;
  summary: string;
  messageId?: string;
  diff?: { before?: string; after?: string };
  at: string;
}

interface LiveState {
  events: LiveEvent[];
  connected: boolean;
  /** Events tied to a chat turn (the user message id) — drives the write chips. */
  forMessage(messageId: string): LiveEvent[];
  /** Bumps whenever a new event arrives; lists refetch on change. */
  version: number;
}

const Ctx = createContext<LiveState>({ events: [], connected: false, forMessage: () => [], version: 0 });

/**
 * One EventSource per tab (TRD §8). EventSource reconnects on its own and sends Last-Event-ID,
 * so the server replays what we missed. Fans events out to chips, Activity, Review badge, Atlas.
 */
export function LiveProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const seen = useRef(new Set<string>());

  useEffect(() => {
    let es: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const open = () => {
      es = new EventSource("/api/stream");
      es.addEventListener("hello", () => setConnected(true));
      es.addEventListener("memory", (msg) => {
        try {
          const e = JSON.parse((msg as MessageEvent).data) as LiveEvent;
          if (seen.current.has(e.id)) return;
          seen.current.add(e.id);
          setEvents((prev) => [...prev.slice(-299), e]);
        } catch {
          /* ignore malformed */
        }
      });
      es.onerror = () => {
        setConnected(false);
        // Browser retries automatically; if it gave up (CLOSED), reopen after a pause.
        if (es?.readyState === EventSource.CLOSED) {
          retry = setTimeout(open, 3000);
        }
      };
    };
    open();
    return () => {
      clearTimeout(retry);
      es?.close();
    };
  }, []);

  const value = useMemo<LiveState>(
    () => ({
      events,
      connected,
      version: events.length,
      forMessage: (id: string) => events.filter((e) => e.messageId === id),
    }),
    [events, connected],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useLive = () => useContext(Ctx);
