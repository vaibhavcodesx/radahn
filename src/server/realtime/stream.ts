import "server-only";
import { ObjectId, type ChangeStream, type ChangeStreamInsertDocument } from "mongodb";
import { collections } from "@/server/db/collections";
import { engine, engineKind, type MemoryEvent, type MemoryEventDTO } from "@/server/memory";

/**
 * Live memory events → Server-Sent Events (TRD §8, PRD F-40).
 * Real engine: a MongoDB change stream on `memory_events` filtered by owner, resumable via the
 * SSE `Last-Event-ID` (we send the event _id; resume = replay events with _id > last).
 * If the change stream errors (M0/serverless quirks) we fall back to polling every 2 s with the
 * same client contract. Mock engine: polls the in-memory store.
 */

const LIFETIME_MS = 270_000; // close before Vercel's 300 s limit; EventSource reconnects

export function toEventDTO(e: MemoryEvent): MemoryEventDTO {
  return {
    id: e._id.toHexString(),
    spaceKey: e.spaceKey,
    memoryId: e.memoryId?.toHexString(),
    kind: e.kind,
    actor: e.actor,
    type: e.type,
    summary: e.summary,
    messageId: e.messageId,
    diff: e.diff,
    at: e.at.toISOString(),
  };
}

export function sseStream(ownerId: string, lastEventId: string | null, signal: AbortSignal): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  let closed = false;
  let cs: ChangeStream | undefined;
  let poll: ReturnType<typeof setInterval> | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let lifetime: ReturnType<typeof setTimeout> | undefined;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: MemoryEventDTO) => {
        if (closed) return;
        controller.enqueue(enc.encode(`id: ${e.id}\nevent: memory\ndata: ${JSON.stringify(e)}\n\n`));
      };
      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(poll);
        clearInterval(heartbeat);
        clearTimeout(lifetime);
        void cs?.close().catch(() => {});
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      signal.addEventListener("abort", close);
      lifetime = setTimeout(close, LIFETIME_MS);
      heartbeat = setInterval(() => !closed && controller.enqueue(enc.encode(`: ping\n\n`)), 20_000);
      controller.enqueue(enc.encode(`retry: 2000\nevent: hello\ndata: {"mode":"${engineKind()}"}\n\n`));

      if (engineKind() === "mock") {
        const eng = await engine();
        let last = lastEventId ?? (await eng.listEvents(ownerId, { limit: 1 })).at(-1)?.id;
        poll = setInterval(async () => {
          const evs = await eng.listEvents(ownerId, { after: last, limit: 50 });
          for (const e of evs) send(e);
          if (evs.length) last = evs.at(-1)!.id;
        }, 1500);
        return;
      }

      const { events } = collections();
      let lastId = lastEventId && ObjectId.isValid(lastEventId) ? new ObjectId(lastEventId) : undefined;

      // Replay anything missed since Last-Event-ID (reconnects are routine on serverless).
      if (lastId) {
        const missed = await events.find({ ownerId, _id: { $gt: lastId } }).sort({ _id: 1 }).limit(100).toArray();
        for (const e of missed) send(toEventDTO(e));
        if (missed.length) lastId = missed.at(-1)!._id;
      }

      const startPolling = () => {
        if (poll || closed) return;
        poll = setInterval(async () => {
          try {
            const q = lastId ? { ownerId, _id: { $gt: lastId } } : { ownerId, at: { $gt: new Date(Date.now() - 5_000) } };
            const evs = await events.find(q).sort({ _id: 1 }).limit(50).toArray();
            for (const e of evs) send(toEventDTO(e));
            if (evs.length) lastId = evs.at(-1)!._id;
          } catch {
            /* transient; next tick retries */
          }
        }, 2000);
      };

      try {
        cs = events.watch<MemoryEvent, ChangeStreamInsertDocument<MemoryEvent>>(
          [{ $match: { operationType: "insert", "fullDocument.ownerId": ownerId } }],
          { maxAwaitTimeMS: 5_000 },
        );
        cs.on("change", (ch) => {
          // The $match above guarantees inserts only.
          const doc = (ch as ChangeStreamInsertDocument<MemoryEvent>).fullDocument;
          lastId = doc._id;
          send(toEventDTO(doc));
        });
        cs.on("error", () => {
          void cs?.close().catch(() => {});
          cs = undefined;
          startPolling();
        });
      } catch {
        startPolling();
      }
    },
    cancel() {
      closed = true;
      clearInterval(poll);
      clearInterval(heartbeat);
      clearTimeout(lifetime);
      void cs?.close().catch(() => {});
    },
  });
}
