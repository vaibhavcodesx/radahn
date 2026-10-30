import Image from "next/image";
import Link from "next/link";
import { TypeSwatch } from "@/components/atoms";
import { MEMORY_TYPE_LIST, MEMORY_TYPE_META } from "@/lib/memory-types";

export const metadata = {
  title: "How it works",
  description: "Radahn's memory engine on MongoDB Atlas: retain, recall, reflect, correct and forget — with every score inspectable.",
};

/** Read-mode explainer for judges (design.md §6.10). Doubles as deck source. */

const FEATURES: Array<[string, string, string]> = [
  ["Document model + $jsonSchema", "memories", "Statement, type, scope, provenance, scores, lifecycle and a 768-d vector in one validated document."],
  ["Atlas Vector Search (pre-filtered)", "recall channel 1 · reconcile", "Semantic recall scoped by owner, space, status and type before scoring."],
  ["Atlas Search (lexical)", "recall channel 2", "Exact names, codes and numbers that embeddings blur (“M0”, “SVNIT”)."],
  ["TTL index on purgeAt", "expired / rejected units, traces, rate limits", "Physical forgetting without cron code. Recall excludes expired units at query time, before the TTL monitor runs."],
  ["Partial unique index", "{ownerId, spaceKey, slotKey} where active", "A database guarantee of one current value per fact, even with two writers racing."],
  ["Multi-document transactions", "supersede · reflection merges · guest → Google", "A correction never leaves a half-updated memory."],
  ["Change streams", "/api/stream → SSE", "Write chips, the Activity feed and the Review badge update live, across tabs and agents."],
  ["Aggregation pipelines", "insights · recall history", "Counts by type, recall hit rate, corrections over time."],
];

const LINEAGE: Array<[string, string, string]> = [
  ["Typed atomic units; retain / recall / reflect", "Hindsight (Vectorize)", "Built natively on MongoDB"],
  ["Four parallel channels fused by rank", "Hindsight recall", "Graph-lite via shared entities; RRF in app code so per-channel ranks stay inspectable"],
  ["Bounded core memory + searchable archive; write approval", "Hermes Agent (Nous Research)", "Core = pinned units with a 1,500-char budget; approval is a real inbox"],
  ["Supersede, not delete; ask when ambiguous", "IHMT-MEMORY", "Enforced with a partial unique index + transactions"],
  ["Recency × importance × relevance; reflection", "Generative Agents (Park et al.)", "Weighted with confidence and an intent-based type boost; scores stored"],
  ["ADD / UPDATE / NOOP reconcile", "Mem0", "Deterministic thresholds first, LLM only for the ambiguous band"],
  ["Core vs archival; sleep-time consolidation", "MemGPT / Letta", "Reflection after replies and on a schedule, visible as task rows"],
  ["Valid-from / valid-to", "Zep / Graphiti", "Out-of-order guard: a past statement can't replace the current value"],
];

export default function HowItWorks() {
  return (
    <main className="min-h-dvh">
      <header className="flex items-center justify-between px-5 py-5 md:px-10">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/brand/radahn-mark.png" alt="" width={28} height={28} className="rounded-[4px]" />
          <span className="mono-label text-ink">Radahn</span>
        </Link>
        <Link href="/signin" className="mono-label inline-flex h-9 items-center rounded-full bg-accent px-4 text-accent-ink hover:opacity-90">Enter as guest ↵</Link>
      </header>

      <article className="mx-auto max-w-[760px] px-5 pb-24 pt-10">
        <p className="mono-label text-ink-3">How it works</p>
        <h1 className="mt-3 font-serif text-[clamp(40px,6vw,68px)] leading-[1.03] tracking-[-0.02em]">A memory you can read, steer, and trust.</h1>
        <p className="mt-6 text-[17px] leading-relaxed text-ink-2">
          Radahn is a personal agent on Gemini 3.8 Flash whose long-term memory lives in MongoDB Atlas as typed, atomic units. Every answer is shaped by
          memories it can name, with the score behind each one, and every memory can be corrected, expired, approved, or forgotten.
        </p>

        <H2 n="01">Ten kinds of memory</H2>
        <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-card bg-line sm:grid-cols-5">
          {MEMORY_TYPE_LIST.map((t) => (
            <li key={t} className="flex flex-col gap-2 bg-canvas p-3">
              <TypeSwatch type={t} size={16} />
              <span className="text-[13px] text-ink">{MEMORY_TYPE_META[t].label}</span>
              <span className="text-[11.5px] leading-snug text-ink-3">{MEMORY_TYPE_META[t].blurb}</span>
            </li>
          ))}
        </ul>
        <P>
          Each unit is one self-contained statement (“Aarav&apos;s build window closes 31 Oct, 9:00 PM IST”) with an owner, a space or global scope, importance,
          confidence, sensitivity, provenance (the quote it came from), recall stats, a lifecycle state and an embedding. Short-term memory is the chat
          transcript in <Code>messages</Code>; long-term memory is <Code>memories</Code>.
        </P>

        <H2 n="02">A turn, end to end</H2>
        <ol className="flex flex-col gap-px overflow-hidden rounded-card bg-line">
          {[
            ["Pre-scan", "Secrets are redacted before the model or the database sees them. Only the kind is logged."],
            ["Recall", "Vector, lexical, temporal and linked-entity channels run in parallel, fused by reciprocal rank, re-scored, de-duplicated (MMR), and budgeted to 8 units. A trace with every candidate and score is stored."],
            ["Answer", "Gemini 3.8 Flash answers with learned behaviours, core memory, the recalled units and any change notices, citing each memory it uses as [[m2]]. If a model is out of quota or hangs, it falls back to 3.6 Flash or 3.5 Flash-Lite before the first token."],
            ["Retain", "After the reply streams, a cheap model extracts candidates. A privacy gate blocks secrets and injection, holds sensitive items for review, and reconcile decides add / confirm / supersede / skip."],
            ["Notify", "Every change is an event in memory_events. A change stream pushes it to the browser as write chips."],
          ].map(([t, b], i) => (
            <li key={t} className="grid grid-cols-[48px_1fr] bg-canvas">
              <span className="border-r border-line p-4 font-mono text-[12px] text-ink-3">{String(i + 1).padStart(2, "0")}</span>
              <div className="p-4">
                <p className="text-[14px] text-ink">{t}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{b}</p>
              </div>
            </li>
          ))}
        </ol>

        <H2 n="03">Why a memory was picked</H2>
        <pre className="overflow-x-auto rounded-card bg-surface p-4 font-mono text-[12.5px] leading-relaxed text-ink shadow-card">
{`final = 0.55 · relevance   (reciprocal-rank fusion across channels)
      + 0.15 · recency     (0.5 ^ (age / half-life of its type))
      + 0.15 · importance
      + 0.10 · confidence  (rises each time you repeat it)
      + 0.10   type boost  (constraints & goals when you're planning)`}
        </pre>
        <P>
          Candidates below 0.35 are dropped. The Memory lens beside every reply shows the real numbers that were used, plus a plain-language reason (“matched
          your words · relevant to planning · confirmed 3×”). The <em>Without memory</em> button re-asks the same question with memory switched off, at the
          same model, and shows the word-level difference.
        </P>

        <H2 n="04">Difficult cases</H2>
        <ul className="flex flex-col gap-3 text-[14px] leading-relaxed text-ink-2">
          <li><strong className="text-ink">Correction.</strong> “Actually, the deadline moved to 10 PM.” The old unit becomes <em>outdated</em>, points to its replacement, and the next answer says what changed.</li>
          <li><strong className="text-ink">Conflict.</strong> One active value per fact is enforced by a partial unique index; near-ties ask you a clarifying question instead of guessing.</li>
          <li><strong className="text-ink">Expiry.</strong> “Remind me this weekend” expires on its own. Recall stops at <Code>expiresAt</Code>; the TTL index deletes it a few minutes later. You can set “expire in 2 minutes” and watch.</li>
          <li><strong className="text-ink">Forget.</strong> A hard delete — statement and vector — leaving a content-free tombstone event.</li>
          <li><strong className="text-ink">Private information.</strong> Credentials are never stored; health, finances, precise location and other people&apos;s details wait in the Review inbox.</li>
        </ul>

        <H2 n="05">Built on MongoDB Atlas</H2>
        <div className="overflow-x-auto rounded-card shadow-card">
          <table className="w-full min-w-[620px] border-collapse bg-surface text-left text-[12.5px]">
            <thead className="mono-label text-[9.5px] text-ink-3">
              <tr className="border-b border-line"><th className="p-3 font-normal">Feature</th><th className="p-3 font-normal">Where</th><th className="p-3 font-normal">Why it matters</th></tr>
            </thead>
            <tbody>
              {FEATURES.map(([f, w, why]) => (
                <tr key={f} className="border-b border-line last:border-0 align-top">
                  <td className="p-3 text-ink">{f}</td>
                  <td className="p-3 font-mono text-[11.5px] text-ink-2">{w}</td>
                  <td className="p-3 text-ink-2">{why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <P>
          At scale: shard <Code>memories</Code> on a hashed <Code>ownerId</Code> (every query is owner-scoped), move search to dedicated Search Nodes, quantize
          the vectors, and switch to Atlas automated embeddings on a dedicated tier.
        </P>

        <H2 n="06">Research lineage</H2>
        <div className="overflow-x-auto rounded-card shadow-card">
          <table className="w-full min-w-[620px] border-collapse bg-surface text-left text-[12.5px]">
            <thead className="mono-label text-[9.5px] text-ink-3">
              <tr className="border-b border-line"><th className="p-3 font-normal">Idea</th><th className="p-3 font-normal">From</th><th className="p-3 font-normal">What we changed</th></tr>
            </thead>
            <tbody>
              {LINEAGE.map(([i, f, c]) => (
                <tr key={i} className="border-b border-line last:border-0 align-top">
                  <td className="p-3 text-ink">{i}</td>
                  <td className="p-3 text-ink-2">{f}</td>
                  <td className="p-3 text-ink-2">{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <P>What is new in the combination: the ghost diff as built-in proof of memory&apos;s effect, stored score breakdowns for every recall, and database-enforced single-truth facts with full history.</P>

        <H2 n="07">Honest limitations</H2>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-[14px] leading-relaxed text-ink-2">
          <li>Free tiers only: Gemini&apos;s free tier has small daily quotas, so answers may come from a fallback model (the UI says which).</li>
          <li>Extraction is an LLM call; it can miss things or over-remember. Everything it writes is visible and reversible.</li>
          <li>Guest memories last 7 days. Sign in with Google to keep them.</li>
          <li>Demo content is a synthetic persona and is labelled DEMO.</li>
        </ul>

        <div className="mt-16 rounded-card bg-grove p-6 text-grove-ink">
          <p className="font-serif text-[24px] leading-snug">Try it: enter as a guest, load the demo world, and ask “Plan my next 4 hours.”</p>
          <Link href="/signin" className="mono-label mt-5 inline-flex h-10 items-center rounded-full bg-grove-ink px-5 text-grove hover:opacity-90">Enter as guest ↵</Link>
        </div>
      </article>
    </main>
  );
}

function H2({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <h2 className="mb-5 mt-16 flex items-baseline gap-4 font-serif text-[30px] leading-tight tracking-[-0.01em]">
      <span className="font-mono text-[13px] text-ink-3">{n}</span>
      {children}
    </h2>
  );
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-5 text-[15px] leading-relaxed text-ink-2">{children}</p>;
}
function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded-[4px] bg-hover-2 px-1 font-mono text-[12.5px] text-ink">{children}</code>;
}
