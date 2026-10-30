import { cn } from "@/lib/utils";
import { MEMORY_TYPE_META, type MemoryTypeName, typeColor, typeInk } from "@/lib/memory-types";

type Status = "active" | "pending_review" | "superseded" | "expired" | "rejected";

/**
 * A Whitney block: the type's colour square with its glyph, plus status treatment
 * (design.md §4.1): pending = hatched, superseded = outline only, expired = 30% opacity.
 */
export function TypeSwatch({
  type,
  status = "active",
  size = 14,
  label = false,
  className,
}: {
  type: MemoryTypeName;
  status?: Status;
  size?: number;
  label?: boolean;
  className?: string;
}) {
  const meta = MEMORY_TYPE_META[type];
  const outline = status === "superseded";
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        aria-hidden
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-[3px] font-mono font-medium leading-none",
          status === "pending_review" && "hatch",
          status === "expired" && "opacity-30",
        )}
        style={{
          width: size,
          height: size,
          fontSize: Math.max(8, Math.round(size * 0.62)),
          background: outline ? "transparent" : typeColor(type),
          color: outline ? typeColor(type) : typeInk(type),
          boxShadow: outline ? `inset 0 0 0 1px ${typeColor(type)}` : undefined,
        }}
      >
        {size >= 12 ? meta.glyph : null}
      </span>
      {label ? (
        <span className="mono-label text-ink-2">{meta.label}</span>
      ) : (
        <span className="sr-only">{meta.label}</span>
      )}
    </span>
  );
}
