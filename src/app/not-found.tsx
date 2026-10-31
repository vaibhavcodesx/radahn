import Link from "next/link";

/**
 * 404 page (design.md §6.11, task E4 & G7).
 * Reuses the landing GlyphField atmosphere with one prominent missing memory cell.
 * Responsive grid that cleanly fits 375px mobile without overflowing (G7).
 */
export default function NotFound() {
  const quietGlyphs = "·:;/\\|·:·;·@+#^!=~<%*";
  const rows = 14;
  const cols = 28;

  // Deterministic memory scatter mapping (simulating the memory glyph field)
  const isTypeCell = (r: number, c: number): string | null => {
    // Missing memory in the center
    if (r === 7 && c === 8) return "missing";
    if (r === 3 && c === 5) return "--t-preference";
    if (r === 4 && c === 12) return "--t-fact";
    if (r === 10 && c === 6) return "--t-goal";
    if (r === 11 && c === 14) return "--t-strategy";
    if (r === 2 && c === 11) return "--t-observation";
    if (r === 8 && c === 3) return "--t-outcome";
    return null;
  };

  const getGlyph = (r: number, c: number) => {
    const idx = (r * 31 + c * 17) % quietGlyphs.length;
    return quietGlyphs[idx];
  };

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 text-center sm:px-6 min-w-0 max-w-full">
      {/* Glyph Field Backdrop (G7: responsive columns, zero overflow at 375px) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center select-none overflow-hidden p-3 sm:p-6 opacity-35 [html[data-theme='light']_&]:opacity-20 max-w-full"
      >
        <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] sm:grid-cols-[repeat(28,minmax(0,1fr))] gap-1.5 sm:gap-2 font-mono text-[11px] sm:text-[12px] leading-none text-ink-3 max-w-full overflow-hidden">
          {Array.from({ length: rows }).map((_, r) =>
            Array.from({ length: cols }).map((__, c) => {
              const type = isTypeCell(r, c);
              const hideOnMobile = c >= 16;
              const mobileClass = hideOnMobile ? "hidden sm:flex" : "flex";

              if (type === "missing") {
                return (
                  <span
                    key={`${r}-${c}`}
                    className={`relative ${mobileClass} size-3.5 sm:size-4 items-center justify-center rounded-[3px] border border-dashed border-red/80 bg-red/10 text-red animate-pulse`}
                    title="Missing memory"
                  >
                    ?
                  </span>
                );
              }
              if (type) {
                return (
                  <span
                    key={`${r}-${c}`}
                    className={`${mobileClass} size-3.5 sm:size-4 items-center justify-center rounded-[2px]`}
                    style={{ background: `var(${type})` }}
                  />
                );
              }
              return (
                <span
                  key={`${r}-${c}`}
                  className={`${mobileClass} size-3.5 sm:size-4 items-center justify-center opacity-40`}
                >
                  {getGlyph(r, c)}
                </span>
              );
            }),
          )}
        </div>
      </div>

      {/* Foreground Content */}
      <div className="relative z-10 mx-auto max-w-[480px]">
        {/* Missing memory token badge */}
        <div className="mx-auto mb-6 flex size-12 items-center justify-center rounded-card border border-red/40 bg-surface shadow-card">
          <span className="font-mono text-[16px] font-semibold text-red">404</span>
        </div>

        <h1 className="font-serif text-[clamp(32px,5vw,48px)] leading-[1.08] tracking-[-0.015em] text-ink">
          Radahn has no memory of this page.
        </h1>

        <p className="mt-4 text-[15.5px] leading-relaxed text-ink-2">
          This record may have been expired, superseded by a correction, or permanently forgotten.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="mono-label inline-flex h-11 items-center rounded-full bg-accent px-6 text-accent-ink transition-opacity hover:opacity-90"
          >
            Go home
          </Link>
          <Link
            href="/app"
            className="mono-label inline-flex h-11 items-center rounded-full border border-line-strong bg-surface px-6 text-ink transition-colors hover:bg-hover"
          >
            Enter chat
          </Link>
        </div>
      </div>
    </main>
  );
}
