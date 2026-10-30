import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "2 min ago", "3 h ago", "4 d ago" — compact, for mono metadata. */
export function timeAgo(iso: string | Date, now: Date = new Date()): string {
  const t = typeof iso === "string" ? new Date(iso) : iso;
  const s = Math.max(0, Math.round((now.getTime() - t.getTime()) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 36) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} d ago`;
}

export function formatScore(n: number | undefined, digits = 2): string {
  return n === undefined || Number.isNaN(n) ? "—" : n.toFixed(digits);
}
