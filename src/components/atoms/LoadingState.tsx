"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Pixel-grid loader from the saved component library (design.md §7 #1, "Drive" variant):
 * a chevron wavefront sweeps a 3×3 grid; the 650 ms cycle is shorter than the sweep, so two
 * fronts are always in flight. Reduced motion freezes the grid; the timer still ticks.
 */
const DRIVE = Array.from({ length: 9 }, (_, i) => {
  const r = Math.floor(i / 3), c = i % 3;
  return (c + Math.abs(r - 1)) * 90;
});

export function PixelGrid({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("grid shrink-0 grid-cols-[repeat(3,4px)] gap-[1.5px]", className)}>
      {DRIVE.map((delay, i) => (
        <span
          key={i}
          className="size-[4px] rounded-[1px] bg-current opacity-15 animate-pixel-on motion-reduce:animate-none"
          style={{ animationDuration: "650ms", animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

function useElapsed() {
  const [ds, setDs] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setDs((d) => d + 1), 100);
    return () => clearInterval(t);
  }, []);
  const s = ds / 10;
  return s < 60 ? `${s.toFixed(1)}s` : `${Math.floor(s / 60)}m ${(s % 60).toFixed(1)}s`;
}

/** Loader + shimmering label + live elapsed time, for any wait the user is watching. */
export function LoadingState({ label, className }: { label: string; className?: string }) {
  const elapsed = useElapsed();
  return (
    <span role="status" className={cn("inline-flex items-center gap-2.5 text-ink", className)}>
      <PixelGrid />
      <span className="shimmer text-[14px] font-medium">{label}</span>
      <span className="font-mono text-[12px] tabular-nums text-ink-3">{elapsed}</span>
    </span>
  );
}
