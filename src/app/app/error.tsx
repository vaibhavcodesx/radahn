"use client";

import Link from "next/link";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center px-6">
      <div className="max-w-[440px] rounded-card bg-surface p-6 shadow-card">
        <p className="mono-label text-[10.5px] text-red">Error{error.digest ? ` · ${error.digest}` : ""}</p>
        <p className="mt-2 font-serif text-[22px] leading-snug">This page didn&apos;t load.</p>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-2">Your memories are safe. This is usually a brief database or network hiccup — try again.</p>
        <div className="mt-4 flex gap-3">
          <button onClick={reset} className="mono-label h-9 rounded-full bg-accent px-4 text-[10.5px] text-accent-ink">Try again</button>
          <Link href="/app" className="mono-label inline-flex h-9 items-center rounded-full px-4 text-[10.5px] text-ink shadow-[inset_0_0_0_1px_var(--line-strong)]">New chat</Link>
        </div>
      </div>
    </div>
  );
}
