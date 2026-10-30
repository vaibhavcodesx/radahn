import { cn } from "@/lib/utils";
import { MEMORY_TYPE_META, type MemoryTypeName, typeColor } from "@/lib/memory-types";

export { Button, type ButtonVariant, type ButtonProps } from "./Button";
export { Kbd } from "./Kbd";
export { TypeSwatch } from "./TypeSwatch";

/** Small chip: leading colour square + label. */
export function EntityChip({
  color,
  children,
  className,
}: {
  color?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-chip bg-hover px-2 text-[12px] text-ink-2",
        className,
      )}
    >
      {color ? <span aria-hidden className="size-2 rounded-[2px]" style={{ background: color }} /> : null}
      {children}
    </span>
  );
}

/** A number in a tinted pill, tabular figures. */
export function ValuePill({ value, className }: { value: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full bg-accent-tint px-2 font-mono text-[11px] tabular text-ink-2",
        className,
      )}
    >
      {value}
    </span>
  );
}

/** "Recalling…" style label with the shimmer sweep. */
export function Shimmer({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("shimmer", className)}>{children}</span>;
}

export interface ScoreParts {
  rrf: number;
  recency: number;
  importance: number;
  confidence: number;
  typeBoost: number;
  final: number;
}

/**
 * Segmented score bar: the real weighted contributions to `final`
 * (memory-engine.md §5.3: 0.55·rrf + 0.15·recency + 0.15·importance + 0.10·confidence + boost).
 */
export function ScoreBar({ scores, className }: { scores: ScoreParts; className?: string }) {
  const segs = [
    { k: "relevance", v: 0.55 * scores.rrf, o: 1 },
    { k: "recency", v: 0.15 * scores.recency, o: 0.75 },
    { k: "importance", v: 0.15 * scores.importance, o: 0.55 },
    { k: "confidence", v: 0.1 * scores.confidence, o: 0.4 },
    { k: "boost", v: scores.typeBoost, o: 0.25 },
  ];
  const total = Math.max(1, segs.reduce((a, s) => a + s.v, 0));
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-grove-line"
        role="img"
        aria-label={`Score ${scores.final.toFixed(2)}: ${segs.map((s) => `${s.k} ${s.v.toFixed(2)}`).join(", ")}`}
      >
        {segs.map((s) => (
          <span
            key={s.k}
            title={`${s.k} ${s.v.toFixed(2)}`}
            className="h-full bg-grove-ink"
            style={{ width: `${(s.v / total) * 100}%`, opacity: s.o }}
          />
        ))}
      </div>
      <span className="font-mono text-[11px] tabular text-grove-ink">{scores.final.toFixed(2)}</span>
    </div>
  );
}

/** Citation square (Teak's nav squares): type colour with the citation index. */
export function CitationSquare({ type, index }: { type: MemoryTypeName; index: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex size-3 items-center justify-center rounded-[2px] align-[1px] font-mono text-[8px] leading-none"
      style={{ background: typeColor(type), color: MEMORY_TYPE_META[type].onSwatch === "dark" ? "var(--t-ink-dark)" : "var(--t-ink-light)" }}
    >
      {index}
    </span>
  );
}
