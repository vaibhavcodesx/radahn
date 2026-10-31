import Link from "next/link";
import { ScoreBar, TypeSwatch } from "@/components/atoms";
import { GlyphField } from "@/components/landing/GlyphField";
import { MorphWord } from "@/components/landing/MorphWord";
import { Nav } from "@/components/landing/Nav";
import { wordDiff } from "@/lib/diff";
import { MEMORY_TYPE_LIST, MEMORY_TYPE_META, type MemoryTypeName } from "@/lib/memory-types";

/**
 * Landing (design.md §6.1, mode: Persuade).
 * Tasks applied: A1 (remove AI-slop), A2 (nav bar), A3 (landing sections).
 * All example content is labelled EXAMPLE; no fake users, logos, or metrics (PRODUCT.md).
 */

const RECALL_CARD: Array<{ type: MemoryTypeName; statement: string; s: [number, number, number, number, number, number]; why: string }> = [
  { type: "constraint", statement: "Build window closes 31 Oct, 9:00 PM IST.", s: [0.82, 0.96, 1, 0.95, 0.1, 0.89], why: 'matched \u201cnext 4 hours\u201d \u00b7 relevant to planning' },
  { type: "preference", statement: "Prefers plans in 30\u201360 minute time boxes.", s: [0.71, 0.98, 0.7, 0.85, 0.1, 0.78], why: "close in meaning \u00b7 confirmed 3\u00d7" },
  { type: "goal", statement: "Wants a top-16 finish at the hackathon.", s: [0.55, 0.9, 0.8, 0.9, 0.1, 0.69], why: "relevant to planning \u00b7 high importance" },
];

const WITHOUT = `Here's a balanced 4-hour plan:
1. Spend the first hour reviewing your goals and priorities.
2. Work on your most important task for 90 minutes.
3. Take a 15-minute break to recharge.
4. Use the last hour for emails, planning, and wrapping up.`;
const WITH = `- 5:00–6:00 Finish recall + citations (deadline is 9 PM tonight).
- 6:00–7:00 Deploy and run the judge path on prod.
- 7:00–8:00 Record the demo video, under 7 minutes.
- 8:00–9:00 README, deck, final deploy by 8:45.`;

/** User-facing value propositions — replaces the old MongoDB features grid (A1/A3). */
const VALUES = [
  { title: "Remembers what matters", desc: "Preferences, deadlines, decisions, outcomes — extracted and typed automatically." },
  { title: "Shows why", desc: "Every answer cites the memories it used, with the real score behind each one." },
  { title: "You stay in control", desc: "Review, correct, expire, or forget any memory. Secrets are never stored." },
  { title: "Forgets on command", desc: "Hard delete from the database. Only a content-free tombstone remains." },
];

export default function Home() {
  const diff = wordDiff(WITHOUT, WITH);
  return (
    <main className="flex min-h-dvh flex-col overflow-x-hidden">
      <Nav />

      {/* FIRST VIEWPORT */}
      <section className="grid items-center gap-12 px-4 pb-10 pt-6 sm:px-6 md:grid-cols-12 md:px-10 md:pt-10">
        <div className="md:col-span-7">
          <h1 className="font-serif text-[clamp(44px,7vw,92px)] leading-[1.02] tracking-[-0.02em]">
            An agent that{" "}
            <mark className="bg-[linear-gradient(transparent_14%,var(--t-preference)_14%,var(--t-preference)_86%,transparent_86%)] px-1 text-[var(--t-ink-dark)] [-webkit-box-decoration-break:clone]">
              remembers
            </mark>
            <br />
            <MorphWord />
          </h1>
          <p className="mt-8 max-w-[52ch] text-[18px] leading-[1.6] text-ink-2">
            Radahn keeps what matters from every conversation, uses it to shape its next answer,{" "}
            <span className="text-ink-3">and shows you exactly which memory did it.</span>
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/signin" className="mono-label inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-accent-ink hover:opacity-90">
              Try it — no sign-up <kbd className="rounded-[4px] bg-[color-mix(in_srgb,var(--accent-ink)_14%,transparent)] px-1.5 text-[10px]">↵</kbd>
            </Link>
            <Link href="/signin" className="mono-label inline-flex h-11 items-center rounded-full px-5 text-ink shadow-[inset_0_0_0_1px_var(--line-strong)] hover:bg-hover">
              Continue with Google
            </Link>
          </div>
        </div>

        {/* floating recall card (Teak) */}
        <div className="md:col-span-5">
          <div className="rotate-[0.6deg] rounded-card bg-grove p-5 text-grove-ink shadow-overlay">
            <div className="flex items-center justify-between">
              <p className="mono-label text-[10.5px]">Recalled 3 · 41 ms</p>
              <p className="mono-label text-[9.5px] text-grove-ink-2">Example</p>
            </div>
            <p className="mt-3 rounded-control bg-grove-2 px-3 py-2 text-[14px]">&ldquo;Plan my next 4 hours.&rdquo;</p>
            <ol className="mt-4 flex flex-col gap-4">
              {RECALL_CARD.map((r) => (
                <li key={r.statement} className="flex flex-col gap-1.5">
                  <TypeSwatch type={r.type} size={13} label />
                  <p className="font-serif text-[16px] leading-snug">{r.statement}</p>
                  <ScoreBar scores={{ rrf: r.s[0], recency: r.s[1], importance: r.s[2], confidence: r.s[3], typeBoost: r.s[4], final: r.s[5] }} />
                  <p className="text-[12px] text-grove-ink-2">{r.why}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* GLYPH FIELD BAND with floating section nav (Griffin) */}
      <section aria-label="How memory moves" className="relative h-[34vh] min-h-[240px] border-y border-line">
        <GlyphField className="absolute inset-0" />
        <nav aria-label="Sections" className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1 rounded-full bg-surface-2/90 p-1 shadow-overlay backdrop-blur-md">
          {[
            ["#proof", "Proof"],
            ["#how", "How it works"],
            ["#trust", "Control"],
          ].map(([href, label]) => (
            <a key={href} href={href} className="mono-label flex min-h-[36px] items-center rounded-full px-3.5 py-1.5 text-[11px] text-ink-2 hover:bg-hover hover:text-ink">
              {label}
            </a>
          ))}
        </nav>
      </section>

      {/* USER-FACING VALUE — replaces MongoDB features grid (A1: remove stack credits, A3: user-facing copy) */}
      <section className="px-4 py-20 sm:px-6 md:px-10">
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-card bg-line sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((v) => (
            <div key={v.title} className="bg-canvas p-6">
              <p className="text-[17px] font-medium leading-tight text-ink">{v.title}</p>
              <p className="mt-2.5 text-[16px] leading-[1.6] text-ink-2">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* GHOST DIFF PROOF */}
      <section id="proof" className="px-4 py-16 sm:px-6 md:px-10">
        <p className="mono-label text-ink-3">Proof</p>
        <h2 className="mt-3 max-w-[18ch] font-serif text-[clamp(32px,4.5vw,56px)] leading-[1.05] tracking-[-0.015em]">Same question. With and without memory.</h2>
        <div className="mt-10 rounded-[20px] bg-grove p-4 text-grove-ink md:p-8">
          <div className="grid gap-px overflow-hidden rounded-card bg-grove-line md:grid-cols-2">
            <div className="bg-grove p-5">
              <p className="mono-label text-[10px] text-grove-ink-2">Without memory</p>
              <p className="mt-3 whitespace-pre-line text-[16px] leading-[1.6] text-grove-ink-2">{WITHOUT}</p>
            </div>
            <div className="bg-grove p-5">
              <p className="mono-label flex items-center gap-2 text-[10px]">
                With memory
                {(["constraint", "preference", "goal"] as const).map((t) => (
                  <TypeSwatch key={t} type={t} size={11} />
                ))}
              </p>
              <p className="mt-3 whitespace-pre-line text-[16px] leading-[1.6]">{WITH}</p>
            </div>
          </div>
          <p className="mt-5 whitespace-pre-wrap rounded-card bg-grove-2 p-5 text-[15px] leading-[1.6]">
            {diff.map((o, i) =>
              o.op === "same" ? <span key={i}>{o.text}</span> : o.op === "add" ? (
                <ins key={i} className="rounded-[2px] bg-[color-mix(in_srgb,var(--t-outcome)_35%,transparent)] no-underline">{o.text}</ins>
              ) : (
                <del key={i} className="rounded-[2px] bg-[color-mix(in_srgb,var(--t-constraint)_25%,transparent)] text-grove-ink-2">{o.text}</del>
              ),
            )}
          </p>
          <p className="mono-label mt-4 text-[10px] text-grove-ink-2">Example · one click on any reply in the app (&ldquo;Without memory&rdquo;) runs this live</p>
        </div>
      </section>

      {/* HOW IT WORKS: numbered rows (LocalCan) */}
      <section id="how" className="px-4 py-16 sm:px-6 md:px-10">
        <p className="mono-label text-ink-3">How it works</p>
        <div className="mt-8 flex flex-col">
          <Row n="01" title="Retain" body="After each reply, Radahn extracts what's worth keeping as typed, atomic memories — preferences, constraints, decisions, outcomes, feedback. Secrets are blocked before anything is sent or stored.">
            <div className="flex flex-wrap gap-2 font-mono text-[11px]">
              <span className="rounded-chip bg-hover px-2 py-1 text-green">+2 REMEMBERED</span>
              <span className="rounded-chip bg-hover px-2 py-1 text-t-preference">1 UPDATED</span>
              <span className="rounded-chip bg-hover px-2 py-1 text-orange">1 NEEDS REVIEW</span>
              <span className="rounded-chip bg-hover px-2 py-1 text-red">1 BLOCKED</span>
            </div>
          </Row>
          <Row n="02" title="Recall" body="Before each reply: vector search, text search, time windows and linked entities run in parallel, fused by rank, then re-scored on relevance, recency, importance and confidence. Every score is stored and shown.">
            <p className="font-mono text-[12px] leading-relaxed text-ink-2">final = 0.55·relevance + 0.15·recency + 0.15·importance + 0.10·confidence + boost</p>
          </Row>
          <Row n="03" title="Reflect" body="In the background, Radahn merges duplicates, writes observations with evidence, and turns repeated feedback into learned behaviour that changes how it answers next time.">
            <ul className="flex flex-col gap-1.5 text-[13px]">
              {["gather", "cluster", "consolidate", "write"].map((s) => (
                <li key={s} className="flex items-center gap-2.5"><span className="size-2 rounded-full bg-green" /><span className="w-24 capitalize">{s}</span></li>
              ))}
              <li className="mt-1 flex gap-2 text-ink-2"><TypeSwatch type="strategy" size={12} className="mt-[3px]" />When asked for a plan, give at most 5 time-boxed bullets.</li>
            </ul>
          </Row>
          <Row n="04" title="Correct & forget" body="Corrections supersede — the old belief stays as history. Expiry is automatic. Forget is a hard delete that leaves only a content-free tombstone.">
            <ol className="flex flex-col gap-1.5 border-l border-line pl-4 text-[13px]">
              <li className="text-ink-3 line-through">Deadline is 9:00 PM.</li>
              <li className="text-ink">Deadline is 10:00 PM. <span className="mono-label text-[9.5px] text-t-preference">current</span></li>
            </ol>
          </Row>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 md:px-10">
        <p className="mx-auto max-w-[28ch] text-center font-serif text-[clamp(28px,3.6vw,46px)] leading-[1.12] tracking-[-0.01em]">
          Most assistants forget you between tabs. <span className="text-ink-3">The rest remember you in secret.</span>
        </p>
      </section>

      {/* TRUST */}
      <section id="trust" className="px-4 py-16 sm:px-6 md:px-10">
        <p className="mono-label text-ink-3">You hold the pen</p>
        <div className="mt-8 grid gap-px overflow-hidden rounded-card bg-line sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Review inbox", "Health, money, location and other people's details wait for your approval."],
            ["Not saved", "Keys, passwords, card numbers, OTPs and sensitive IDs are redacted before the model sees them."],
            ["Forget means forget", "Hard delete from the database. Only a tombstone with no content remains."],
            ["Free tier, honest", "Radahn runs on a free tier, where the provider may use prompts to improve its products."],
          ].map(([t, b]) => (
            <div key={t} className="bg-canvas p-6">
              <p className="text-[16px] font-medium text-ink">{t}</p>
              <p className="mt-2 text-[15px] leading-[1.6] text-ink-3">{b}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-24 text-center sm:px-6 md:px-10">
        <h2 className="mx-auto max-w-[16ch] font-serif text-[clamp(36px,5vw,64px)] leading-[1.04] tracking-[-0.015em]">See what your agent remembers.</h2>
        <Link href="/signin" className="mono-label mt-10 inline-flex h-11 items-center rounded-full bg-accent px-6 text-accent-ink hover:opacity-90">
          Try it — no sign-up
        </Link>
        <p className="mt-4 text-[15px] text-ink-3">Load the demo world in one click.</p>
      </section>

      {/* FOOTER — A3: product name, GitHub, How it works. No stack credits. */}
      <footer className="border-t border-line px-4 pb-8 pt-12 sm:px-6 md:px-10">
        <div className="flex flex-wrap items-start justify-between gap-8">
          <div className="flex gap-1.5" aria-hidden>
            {MEMORY_TYPE_LIST.map((t) => (
              <span key={t} className="size-3 rounded-[2px]" style={{ background: `var(${MEMORY_TYPE_META[t].colorVar})` }} />
            ))}
          </div>
          <nav className="flex gap-8 text-[15px] text-ink-2">
            <Link href="/how-it-works" className="hover:text-ink">How it works</Link>
            <a href="https://github.com/vaibhavcodesx/radahn" className="hover:text-ink">GitHub</a>
          </nav>
        </div>
        <p aria-hidden className="mt-12 select-none font-serif text-[clamp(64px,18vw,260px)] leading-[0.8] tracking-[-0.04em] text-[color-mix(in_srgb,var(--ink)_9%,transparent)]">RADAHN</p>
        <p className="mt-6 text-[13px] text-ink-3">© 2026 Radahn. Example content is synthetic.</p>
      </footer>
    </main>
  );
}

function Row({ n, title, body, children }: { n: string; title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-6 border-t border-line py-10 md:grid-cols-12">
      <p className="font-mono text-[13px] text-ink-3 md:col-span-1">{n}</p>
      <div className="md:col-span-5">
        <h3 className="font-serif text-[30px] leading-tight">{title}</h3>
        <p className="mt-3 max-w-[48ch] text-[15px] leading-relaxed text-ink-2">{body}</p>
      </div>
      <div className="flex items-center rounded-card bg-surface p-5 shadow-card md:col-span-6">{children}</div>
    </div>
  );
}
