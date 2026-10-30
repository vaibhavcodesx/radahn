import Link from "next/link";

// design.md §6.11: the glyph field with one missing cell.
export default function NotFound() {
  const glyphs = "·:;/\\|·:·";
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div aria-hidden className="grid grid-cols-9 gap-1.5 font-mono text-[13px] text-ink-3">
        {Array.from({ length: 27 }, (_, i) =>
          i === 13 ? (
            <span key={i} className="size-4 rounded-[2px] shadow-[inset_0_0_0_1px_var(--t-constraint)]" />
          ) : (
            <span key={i} className="flex size-4 items-center justify-center opacity-40">{glyphs[(i * 5) % glyphs.length]}</span>
          ),
        )}
      </div>
      <h1 className="mt-8 font-serif text-[34px] leading-tight">Radahn has no memory of this page.</h1>
      <Link href="/" className="mono-label mt-6 inline-flex h-10 items-center rounded-full bg-accent px-5 text-accent-ink">Go home</Link>
    </main>
  );
}
