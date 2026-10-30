"use client";

import { forceCollide, forceLink, forceSimulation, forceX, forceY, type Simulation, type SimulationLinkDatum, type SimulationNodeDatum } from "d3-force";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MEMORY_TYPE_LIST, MEMORY_TYPE_META, STATUS_LABEL, type MemoryTypeName } from "@/lib/memory-types";
import { cn, timeAgo } from "@/lib/utils";

/**
 * Atlas "Field" (design.md §6.5): every memory as a Whitney square in the grove room.
 * Size = importance, brightness = recency, hatched = pending, outline = superseded (with a line
 * to its successor), dotted lines = evidence. "Arrange by" re-lays the field with forces.
 */

interface GNode extends SimulationNodeDatum {
  id: string;
  type: MemoryTypeName;
  status: string;
  statement: string;
  importance: number;
  spaceKey: string;
  updatedAt: string;
  recallCount: number;
  size: number;
}
interface GLink extends SimulationLinkDatum<GNode> {
  kind: "supersede" | "evidence" | "related";
}
type Arrange = "type" | "space" | "time";

export function AtlasField({ spaceNames }: { spaceNames: Record<string, string> }) {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<Simulation<GNode, GLink> | null>(null);
  const [data, setData] = useState<{ nodes: GNode[]; links: GLink[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [arrange, setArrange] = useState<Arrange>("type");
  const [hover, setHover] = useState<{ node: GNode; x: number; y: number; cw: number } | null>(null);
  const hoverId = useRef<string | null>(null);
  const redraw = useRef<(() => void) | null>(null);

  // Hover only repaints; it must not restart the simulation.
  useEffect(() => {
    hoverId.current = hover?.node.id ?? null;
    redraw.current?.();
  }, [hover]);

  useEffect(() => {
    let alive = true;
    fetch("/api/memories/graph")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: { nodes: Omit<GNode, "size">[]; links: Array<{ source: string; target: string; kind: GLink["kind"] }> }) => {
        if (!alive) return;
        const ids = new Set(j.nodes.map((n) => n.id));
        setData({
          nodes: j.nodes.map((n) => ({ ...n, type: n.type as MemoryTypeName, size: 8 + n.importance * 1.6 })),
          links: j.links.filter((l) => ids.has(l.source) && ids.has(l.target)).map((l) => ({ ...l })),
        });
      })
      .catch(() => alive && setError("Couldn't load the field."));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!data) return;
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    const ctx = canvas.getContext("2d")!;
    const css = getComputedStyle(document.documentElement);
    const col = (v: string) => css.getPropertyValue(v).trim();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = wrap.clientWidth;
    let h = wrap.clientHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = () => {
      w = wrap.clientWidth;
      h = wrap.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();

    const spaces = [...new Set(data.nodes.map((n) => n.spaceKey))];
    const times = data.nodes.map((n) => Date.parse(n.updatedAt));
    const [tMin, tMax] = [Math.min(...times), Math.max(...times)];
    const target = (n: GNode): [number, number] => {
      if (arrange === "type") {
        const i = MEMORY_TYPE_LIST.indexOf(n.type);
        return [((i + 0.5) / MEMORY_TYPE_LIST.length) * w, h / 2];
      }
      if (arrange === "space") {
        const i = spaces.indexOf(n.spaceKey);
        return [((i + 0.5) / spaces.length) * w, h / 2];
      }
      const t = tMax === tMin ? 0.5 : (Date.parse(n.updatedAt) - tMin) / (tMax - tMin);
      return [w * 0.08 + t * w * 0.84, h / 2 + (MEMORY_TYPE_LIST.indexOf(n.type) - 4.5) * (h / 14)];
    };

    const sim = (simRef.current ??= forceSimulation<GNode>(data.nodes));
    sim
      .nodes(data.nodes)
      .force("x", forceX<GNode>((n) => target(n)[0]).strength(arrange === "time" ? 0.25 : 0.12))
      .force("y", forceY<GNode>((n) => target(n)[1]).strength(arrange === "time" ? 0.25 : 0.04))
      .force("collide", forceCollide<GNode>((n) => n.size * 0.75 + 2))
      .force("link", forceLink<GNode, GLink>(data.links).id((n) => n.id).strength(0.05))
      .alpha(0.9)
      .restart();

    const now = Date.now();
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      // column labels
      ctx.font = `10px ui-monospace, monospace`;
      ctx.fillStyle = col("--grove-ink-2");
      ctx.textAlign = "center";
      if (arrange === "type") MEMORY_TYPE_LIST.forEach((t, i) => ctx.fillText(MEMORY_TYPE_META[t].label.toUpperCase(), ((i + 0.5) / MEMORY_TYPE_LIST.length) * w, 18));
      if (arrange === "space") spaces.forEach((s, i) => ctx.fillText((spaceNames[s] ?? "Space").toUpperCase(), ((i + 0.5) / spaces.length) * w, 18));
      if (arrange === "time") {
        ctx.fillText("OLDER", w * 0.08, 18);
        ctx.fillText("NEWER", w * 0.92, 18);
      }
      // links
      for (const l of data.links) {
        const s = l.source as GNode;
        const t = l.target as GNode;
        if (s.x == null || t.x == null) continue;
        ctx.globalAlpha = l.kind === "supersede" ? 0.6 : 0.35;
        ctx.strokeStyle = col("--grove-ink");
        ctx.setLineDash(l.kind === "evidence" ? [2, 3] : []);
        ctx.beginPath();
        ctx.moveTo(s.x, s.y!);
        ctx.lineTo(t.x, t.y!);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      // nodes
      for (const n of data.nodes) {
        if (n.x == null) continue;
        const ageDays = (now - Date.parse(n.updatedAt)) / 86_400_000;
        const alpha = n.status === "expired" ? 0.3 : Math.max(0.45, 1 - ageDays / 14);
        const s = n.size;
        const c = col(MEMORY_TYPE_META[n.type].colorVar);
        ctx.globalAlpha = alpha;
        if (n.status === "superseded") {
          ctx.strokeStyle = c;
          ctx.lineWidth = 1.2;
          ctx.strokeRect(n.x - s / 2, n.y! - s / 2, s, s);
        } else {
          ctx.fillStyle = c;
          ctx.fillRect(n.x - s / 2, n.y! - s / 2, s, s);
          if (n.status === "pending_review") {
            ctx.strokeStyle = "rgba(0,0,0,.45)";
            ctx.lineWidth = 1.5;
            ctx.save();
            ctx.beginPath();
            ctx.rect(n.x - s / 2, n.y! - s / 2, s, s);
            ctx.clip();
            for (let k = -s; k < s; k += 4) {
              ctx.beginPath();
              ctx.moveTo(n.x - s / 2 + k, n.y! + s / 2);
              ctx.lineTo(n.x - s / 2 + k + s, n.y! - s / 2);
              ctx.stroke();
            }
            ctx.restore();
          }
        }
        if (hoverId.current === n.id) {
          ctx.globalAlpha = 1;
          ctx.strokeStyle = col("--grove-ink");
          ctx.strokeRect(n.x - s / 2 - 3, n.y! - s / 2 - 3, s + 6, s + 6);
        }
      }
      ctx.globalAlpha = 1;
    };
    redraw.current = draw;
    sim.on("tick", draw);
    if (reduce) {
      sim.stop();
      for (let i = 0; i < 200; i++) sim.tick();
      draw();
    }
    const ro = new ResizeObserver(() => {
      size();
      sim.alpha(0.3).restart();
    });
    ro.observe(wrap);
    return () => {
      sim.on("tick", null);
      ro.disconnect();
    };
  }, [data, arrange, spaceNames]);

  const pick = (e: React.MouseEvent) => {
    if (!data) return null;
    const r = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    let best: GNode | null = null;
    let bd = 1e9;
    for (const n of data.nodes) {
      const d = Math.hypot((n.x ?? -99) - x, (n.y ?? -99) - y);
      if (d < n.size * 0.8 + 4 && d < bd) {
        bd = d;
        best = n;
      }
    }
    return best ? { node: best, x, y, cw: r.width } : null;
  };

  return (
    <div className="mt-4 overflow-hidden rounded-card bg-grove text-grove-ink shadow-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-grove-line px-4 py-2.5">
        <span className="mono-label text-[10px] text-grove-ink-2">Arrange by</span>
        {(["type", "space", "time"] as const).map((a) => (
          <button
            key={a}
            onClick={() => setArrange(a)}
            aria-pressed={arrange === a}
            className={cn("mono-label h-7 rounded-full px-3 text-[10px]", arrange === a ? "bg-grove-ink text-grove" : "text-grove-ink-2 shadow-[inset_0_0_0_1px_var(--grove-line)] hover:text-grove-ink")}
          >
            {a}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-grove-ink-2">size = importance · brightness = recency · outline = outdated · hatched = needs review</span>
      </div>
      <div
        ref={wrapRef}
        className="relative h-[62vh] min-h-[420px] cursor-crosshair"
        onMouseMove={(e) => setHover(pick(e))}
        onMouseLeave={() => setHover(null)}
        onClick={(e) => {
          const p = pick(e);
          if (p) router.push(`/app/memory/${p.node.id}`);
        }}
      >
        <canvas ref={canvasRef} aria-hidden className="absolute inset-0" />
        {!data && !error ? <p className="shimmer absolute inset-0 m-auto h-fit w-fit text-[13px]">Laying out memories…</p> : null}
        {error ? <p className="absolute inset-0 m-auto h-fit w-fit text-[13px] text-grove-ink-2">{error}</p> : null}
        {data && data.nodes.length === 0 ? <p className="absolute inset-0 m-auto h-fit w-fit text-[13px] text-grove-ink-2">No memories yet.</p> : null}
        {hover ? (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-10 w-72 animate-pop-in rounded-card bg-tooltip-bg p-3 shadow-overlay"
            style={{ left: Math.min(hover.x + 14, hover.cw - 300), top: Math.max(8, hover.y - 20) }}
          >
            <p className="mono-label flex justify-between text-[9.5px] text-tooltip-muted">
              <span>{MEMORY_TYPE_META[hover.node.type].label} · {STATUS_LABEL[hover.node.status]}</span>
              <span>{timeAgo(hover.node.updatedAt)}</span>
            </p>
            <p className="mt-1 font-serif text-[14px] leading-snug text-tooltip-fg">{hover.node.statement}</p>
            <p className="mt-1 text-[11px] text-tooltip-muted">{spaceNames[hover.node.spaceKey] ?? "Global"} · recalled {hover.node.recallCount}×</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
