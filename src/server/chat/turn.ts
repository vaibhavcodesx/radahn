import "server-only";
import { sweepRetiredOwner } from "@/server/auth/migrate";
import {
  createUIMessageStream,
  generateId,
  isStepCount,
  streamText,
  toUIMessageStream,
  type ModelMessage,
} from "ai";
import { after } from "next/server";
import type { RadahnUIMessage, RecallPickWire } from "@/lib/chat-types";
import type { SessionUser } from "@/server/auth/session";
import { collections, type MessageDoc } from "@/server/db/collections";
import { candidates, generatePlain, modelLabel, providerOf, thinkingOptions } from "@/server/llm/registry";
import { engine, type RecallResult } from "@/server/memory";
import { citedIds, stripCitations } from "@/lib/citations";
import { startWithFallback } from "./stream-fallback";
import { memoryTools } from "./tools";
import {
  createConversation,
  displayName,
  getConversation,
  getSettings,
  getSpace,
  listMessages,
} from "@/server/app/workspace";
import { ObjectId } from "mongodb";
import { appUrl, env } from "@/server/env";

/**
 * One chat turn (TRD §6 POST /api/chat, architecture.md §2):
 * pre-scan → persist user msg → recall → data-recall → stream reply with memory tools →
 * persist assistant msg → after(): extract + reconcile (writes arrive as SSE write chips).
 */

export interface TurnInput {
  user: SessionUser;
  message: RadahnUIMessage; // the new user message (client id kept for provenance)
  conversationId?: string;
  spaceId: string;
  model?: string;
}

const HISTORY_LIMIT = 12;

function textOf(m: { parts: RadahnUIMessage["parts"] }): string {
  return m.parts
    .filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export function toWirePick(p: RecallResult["picks"][number]): RecallPickWire {
  return {
    ref: p.ref,
    memoryId: p.memoryId,
    type: p.type,
    statement: p.statement,
    final: p.final,
    scores: {
      vector: p.scores.vector,
      rrf: p.scores.rrf,
      recency: p.scores.recency,
      importance: p.scores.importance,
      confidence: p.scores.confidence,
      typeBoost: p.scores.typeBoost,
      final: p.scores.final,
    },
    reasons: p.reasons,
    why: p.why,
    ageDays: p.ageDays,
    confirmCount: p.confirmCount,
  };
}

export async function runTurn(input: TurnInput): Promise<ReadableStream> {
  const { user } = input;
  const ownerId = user.id;
  const eng = await engine();
  const settings = await getSettings(user);
  const space = await getSpace(ownerId, input.spaceId);
  const spaceKey = space._id.toHexString();
  const name = displayName(user, settings);

  const conversation = input.conversationId
    ? await getConversation(ownerId, input.conversationId)
    : await createConversation(ownerId, spaceKey);
  const conversationId = conversation._id.toHexString();

  // 1. Pre-scan before the LLM or DB sees anything (memory-engine.md §4.1).
  const rawText = textOf(input.message).slice(0, 8000);
  const scan = eng.preScan(rawText);
  const userText = scan.redacted;

  // 2. History (short-term memory) + persist the redacted user message.
  const history = await listMessages(ownerId, conversationId, 200);
  const recent = history.slice(-HISTORY_LIMIT);
  const now = new Date();
  const userDoc: MessageDoc = {
    _id: new ObjectId(),
    conversationId,
    ownerId,
    role: "user",
    uiId: input.message.id,
    parts: [{ type: "text", text: userText }],
    text: userText,
    citedMemoryIds: [],
    redactions: scan.kinds.length ? scan.kinds : undefined,
    createdAt: now,
  };
  const { messages, conversations } = collections();
  await messages.insertOne(userDoc);
  await conversations.updateOne({ _id: conversation._id, ownerId }, { $set: { lastMessageAt: now } });

  const assistantUiId = generateId();
  const previousUser = [...recent].reverse().find((m) => m.role === "user")?.text;

  // Deferred: the assistant text is known only when the stream ends; after() waits for it.
  type Finished = { text: string; recall?: RecallResult; refs: Record<string, string>; model?: string; toolWrote?: boolean };
  let finish!: (v: Finished) => void;
  const finished = new Promise<Finished>((r) => (finish = r));

  after(async () => {
    const result = await finished;
    if (!result.text) return;
    // The model already saved, corrected or forgot something with its tools this turn; a second
    // extraction pass would record the same change again as a near-duplicate memory.
    if (result.toolWrote) return;
    const turns = [
      ...recent.slice(-4).map((m) => ({ role: m.role, text: stripCitations(m.text) })),
      { role: "user" as const, text: userText },
      { role: "assistant" as const, text: stripCitations(result.text) },
    ];
    try {
      const summary = await eng.extractAndWrite({
        ownerId,
        spaceKey,
        conversationId,
        messageId: input.message.id,
        turns,
        recalled: result.recall?.picks ?? [],
        userName: name,
        timeZone: settings.timeZone,
        now: new Date(),
        policy: settings.writePolicy,
      });
      await messages.updateOne(
        { ownerId, uiId: assistantUiId },
        {
          $set: {
            writeSummary: {
              messageId: input.message.id,
              added: summary.added,
              confirmed: summary.confirmed,
              superseded: summary.superseded,
              pending: summary.pending,
              blocked: summary.blocked,
            },
          },
        },
      );
      // Automatic reflection every 8 new units in this space (memory-engine.md §7), as its own
      // request so it gets its own time budget (TRD §10). Claim the counter first so two turns
      // finishing together don't both trigger it.
      const claimed = await collections().spaces.findOneAndUpdate(
        { _id: space._id, ownerId, unitsSinceReflection: { $gte: 8 } },
        { $set: { unitsSinceReflection: 0, lastReflectionAt: new Date() } },
      );
      if (claimed) {
        await fetch(`${appUrl()}/api/reflect/internal`, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${env().CRON_SECRET}` },
          body: JSON.stringify({ ownerId, spaceKey }),
          signal: AbortSignal.timeout(110_000),
        }).catch(() => {});
      }
    } catch (e) {
      console.error("[turn] extractAndWrite failed", (e as Error)?.name, (e as Error)?.message?.slice(0, 160));
    }
    // Title once per conversation, on the cheap model.
    if (conversation.title === "New chat") {
      try {
        const { text } = await generatePlain("fast", {
          system: "Write a 2-5 word title for this chat. No quotes, no punctuation at the end.",
          prompt: userText.slice(0, 600),
          timeoutMs: 8000,
        });
        const title = text.trim().replace(/^["']|["'.]$/g, "").slice(0, 60);
        if (title) await conversations.updateOne({ _id: conversation._id, ownerId }, { $set: { title } });
      } catch {
        /* keep "New chat" */
      }
    }
    // A guest who upgraded to Google mid-turn: re-own anything written above under the old id.
    await sweepRetiredOwner(ownerId).catch(() => {});
  });

  // Shared between execute() and onEnd(): the outer onEnd sees every part (data + model).
  let recall: RecallResult | undefined;
  let refs: Record<string, string> = {};
  let servedModel: string | undefined;

  return createUIMessageStream<RadahnUIMessage>({
    execute: async ({ writer }) => {
      writer.write({ type: "start", messageId: assistantUiId });
      writer.write({
        type: "data-turn",
        data: { conversationId, userMessageId: input.message.id, assistantMessageId: assistantUiId },
      });
      if (scan.kinds.length) writer.write({ type: "data-redaction", data: { kinds: scan.kinds } });

      // 3. Recall (memory-engine.md §5) — the lens shows "Recalling…" while this runs.
      writer.write({ type: "data-recall", id: "recall", data: { status: "running" } });
      try {
        recall = await eng.recall({
          ownerId,
          spaceKey,
          query: userText,
          previousUserMessage: previousUser,
          conversationId,
          messageId: assistantUiId,
        });
        writer.write({
          type: "data-recall",
          id: "recall",
          data: {
            status: "done",
            recallId: recall.recallId,
            intent: recall.intent,
            channels: recall.channelsRan,
            picks: recall.picks.map(toWirePick),
            core: recall.core.map((m) => ({ id: m.id, type: m.type, statement: m.statement })),
            strategies: recall.strategies.map((m) => ({ id: m.id, statement: m.statement })),
            notices: recall.notices.map((n) => n.text),
            latencyMs: Math.round(recall.latencyMs.total),
            candidateCount: recall.candidates.length,
          },
        });
        for (const n of recall.notices) writer.write({ type: "data-notice", data: { kind: n.kind, text: n.text } });
      } catch (e) {
        console.error("[turn] recall failed", (e as Error)?.message?.slice(0, 160));
        writer.write({ type: "data-recall", id: "recall", data: { status: "error" } });
      }

      // 4. Context (memory-engine.md §6.2).
      const ctx = recall
        ? eng.buildContext({ userName: name, timeZone: settings.timeZone, now: new Date(), spaceName: space.name, recall })
        : { system: eng.ghostContext({ timeZone: settings.timeZone, now: new Date() }), refs: {} };

      const modelMessages: ModelMessage[] = [
        ...recent.map((m) => ({ role: m.role, content: m.role === "assistant" ? stripCitations(m.text) : m.text }) as ModelMessage),
        { role: "user", content: userText },
      ];

      refs = ctx.refs;
      const tools = memoryTools({ engine: eng, ownerId, spaceKey, conversationId, messageId: input.message.id, refs: ctx.refs, writer });

      // 5. Stream with pre-first-token model fallback.
      const all = await candidates("chat", input.model ?? settings.chatModel);
      // Groq's free tier allows ~8k tokens/minute per model, and every tool step resends the whole
      // context, so a long prompt fails mid-answer ("Reply failed"). Keep large turns on Gemini.
      const approxTokens = Math.ceil((ctx.system.length + modelMessages.reduce((n, m) => n + String(m.content).length, 0)) / 3.5);
      const list = approxTokens > 2200 && all.some((c) => providerOf(c.modelId) !== "groq") ? all.filter((c) => providerOf(c.modelId) !== "groq") : all;
      const started = await startWithFallback(list, (c, signal) =>
        streamText({
          model: c.model,
          system: ctx.system,
          messages: modelMessages,
          tools,
          // Room for several memory tool calls and still a written answer (3 was used up by three
          // remember calls, leaving the reply with chips and no text).
          stopWhen: isStepCount(6),
          maxRetries: 0,
          providerOptions: thinkingOptions(c.modelId, "low"),
          abortSignal: AbortSignal.any([signal, AbortSignal.timeout(45_000)]),
        }),
      );
      servedModel = started.candidate.modelId;
      writer.write({
        type: "data-model",
        data: { id: started.candidate.modelId, label: modelLabel(started.candidate.modelId), fallback: started.candidate.fallback },
      });

      writer.merge(
        toUIMessageStream<typeof tools, RadahnUIMessage>({
          stream: started.stream,
          tools,
          sendStart: false,
          onError: () => "The model stopped unexpectedly. Try again.",
        }),
      );
    },
    onEnd: async ({ responseMessage }) => {
      const text = textOf(responseMessage);
      if (!text && !responseMessage.parts.some((p) => p.type.startsWith("tool-"))) {
        finish({ text: "", refs: {} });
        return;
      }
      const cited = citedIds(text, refs);
      try {
        await messages.insertOne({
          _id: new ObjectId(),
          conversationId,
          ownerId,
          role: "assistant",
          uiId: assistantUiId,
          parts: responseMessage.parts as unknown[],
          text,
          recallId: recall?.recallId || undefined,
          citedMemoryIds: cited,
          model: servedModel,
          createdAt: new Date(),
        });
        await conversations.updateOne({ _id: conversation._id, ownerId }, { $set: { lastMessageAt: new Date() } });
        if (cited.length) {
          await collections().memories.updateMany(
            { ownerId, _id: { $in: cited.map((i) => new ObjectId(i)) } },
            { $inc: { "stats.citedCount": 1 } },
          );
        }
      } finally {
        const toolWrote = responseMessage.parts.some(
          // Only a real correction or forget handled the change; a remember that merely confirmed an
          // existing memory must not stop extraction from catching the update.
          (p) =>
            /^tool-(correct_memory|forget_memory)$/.test(p.type) &&
            (p as { state?: string; output?: { updated?: boolean; forgotten?: boolean } }).state === "output-available" &&
            Boolean((p as { output?: { updated?: boolean; forgotten?: boolean } }).output?.updated || (p as { output?: { forgotten?: boolean } }).output?.forgotten),
        );
        finish({ text, recall, refs, model: servedModel, toolWrote });
      }
    },
    onError: (e) => {
      finish({ text: "", refs: {} });
      const msg = String((e as Error)?.message ?? e).toLowerCase();
      if (/quota|429|exhausted|rate/.test(msg)) return "Gemini's free tier is busy right now. Your memory still works — try again in a minute.";
      return "I couldn't finish that reply. Try again.";
    },
  });
}
