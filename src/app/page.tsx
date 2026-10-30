import Image from "next/image";
import Link from "next/link";
import { MEMORY_TYPE_LIST, MEMORY_TYPE_META, typeColor, typeInk } from "@/lib/memory-types";

// Phase 0 placeholder for the landing (design.md §6.1). The full version — glyph field,
// ghost-diff panel, how-it-works rows — replaces this in Phase 3.
export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-6 py-5 md:px-10">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/brand/radahn-mark.png" alt="" width={28} height={28} className="rounded-[4px]" priority />
          <span className="mono-label text-ink">Radahn</span>
        </Link>
        <nav className="flex items-center gap-6">
          <a href="https://github.com/vaibhavcodesx/radahn" className="mono-label text-ink-2 hover:text-ink">
            GitHub
          </a>
          <Link
            href="/signin"
            className="mono-label inline-flex h-9 items-center rounded-full bg-accent px-4 text-accent-ink hover:opacity-90"
          >
            Enter as guest ↵
          </Link>
        </nav>
      </header>

      <section className="grid flex-1 items-center gap-12 px-6 pb-10 md:grid-cols-12 md:px-10">
        <div className="md:col-span-7">
          <p className="mono-label mb-6 text-ink-3">01 · Agentic memory · UNCHARTED 2026</p>
          <h1 className="font-serif text-[clamp(44px,7vw,92px)] leading-[1.02] tracking-[-0.02em]">
            An agent that{" "}
            <mark className="bg-[linear-gradient(transparent_15%,var(--t-preference)_15%,var(--t-preference)_85%,transparent_85%)] px-1 text-ink [-webkit-box-decoration-break:clone]">
              remembers
            </mark>
            <br />
            <span className="text-ink-2">what you decided.</span>
          </h1>
          <p className="mt-8 max-w-[52ch] text-[17px] leading-relaxed text-ink-2">
            Radahn keeps what matters from every conversation, uses it to shape its next answer,{" "}
            <span className="text-ink-3">and shows you exactly which memory did it.</span>
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/signin"
              className="mono-label inline-flex h-11 items-center rounded-full bg-accent px-5 text-accent-ink hover:opacity-90"
            >
              Enter as guest ↵
            </Link>
            <Link
              href="/signin"
              className="mono-label inline-flex h-11 items-center rounded-full px-5 text-ink shadow-[inset_0_0_0_1px_var(--line-strong)] hover:bg-hover"
            >
              Continue with Google
            </Link>
          </div>
        </div>

        <div className="md:col-span-5">
          <div className="rounded-card bg-grove p-5 shadow-overlay">
            <p className="mono-label mb-4 text-grove-ink-2">Ten kinds of memory</p>
            <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-control bg-grove-line">
              {MEMORY_TYPE_LIST.map((t) => (
                <li key={t} className="flex items-center gap-2.5 bg-grove px-3 py-2.5">
                  <span
                    aria-hidden
                    className="inline-flex size-5 items-center justify-center rounded-[3px] font-mono text-[11px]"
                    style={{ background: typeColor(t), color: typeInk(t) }}
                  >
                    {MEMORY_TYPE_META[t].glyph}
                  </span>
                  <span className="text-[13px] text-grove-ink">{MEMORY_TYPE_META[t].label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-4 md:px-10">
        <span className="mono-label text-ink-3">Built on MongoDB Atlas · Gemini 3.8 Flash</span>
        <span className="text-[12px] text-ink-3">
          Runs on the Gemini free tier: Google may use prompts to improve its products. Don&apos;t enter real secrets.
        </span>
      </footer>
    </main>
  );
}
