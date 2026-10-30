"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The glyph field ("held sky", design.md §5): a canvas of quiet mono characters where each
 * memory is a coloured cell. A loop plays the four verbs of memory: RETAIN (cells fall in and
 * settle), RECALL (three cells light and lines rise to the answer), SUPERSEDE (one cell goes
 * to outline, its replacement appears beside it), FORGET (one cell fades back to a glyph).
 * Canvas 2D, DPR-aware, paused off-screen; reduced motion renders one still frame.
 */

const TYPES = ["profile", "preference", "fact", "goal", "constraint", "decision", "outcome", "feedback", "strategy", "observation"] as const;
const GLYPH: Record<(typeof TYPES)[number], string> = { profile: "@", preference: "+", fact: "#", goal: "^", constraint: "!", decision: "=", outcome: "~", feedback: "<", strategy: "%", observation: "*" };
const DARK_INK = new Set(["profile", "preference", "goal", "feedback", "observation"]);
const QUIET = "·:;/\\|·:·";
const CELL = 18;

type Phase = "retain" | "recall" | "supersede" | "forget";
const PHASES: Array<{ id: Phase; label: string; caption: string; ms: number }> = [
  { id: "retain", label: "01 RETAIN", caption: "“I hate long answers. Give me bullets.” → 3 memories", ms: 3600 },
  { id: "recall", label: "02 RECALL", caption: "“Plan my next 4 hours.” → 3 memories light up", ms: 3600 },
  { id: "supersede", label: "03 SUPERSEDE", caption: "“The deadline moved to 10 PM.” → old one kept as history", ms: 3200 },
  { id: "forget", label: "04 FORGET", caption: "“Forget my address.” → gone for real", ms: 3000 },
];

interface Mem {
  col: number;
  row: number;
  type: (typeof TYPES)[number];
  born: number; // ms timestamp of arrival (for fall animation)
  outline?: boolean;
  fading?: number; // start of fade-out
}

function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

export function GlyphField({ className, onPhase }: { className?: string; onPhase?: (p: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rand = seeded(42);
    let w = 0;
    let h = 0;
    let cols = 0;
    let rows = 0;
    let mems: Mem[] = [];
    let lit: Mem[] = [];
    let quiet: string[] = [];
    let raf = 0;
    let visible = true;
    let phaseIdx = 0;
    let phaseStart = performance.now();
    const css = getComputedStyle(document.documentElement);
    const color = (t: string) => css.getPropertyValue(`--t-${t}`).trim() || "#888";
    const ink3 = () => css.getPropertyValue("--ink-3").trim();
    const ink = () => css.getPropertyValue("--ink").trim();

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.max(8, Math.floor(w / CELL));
      rows = Math.max(4, Math.floor(h / CELL));
      quiet = Array.from({ length: cols * rows }, () => QUIET[Math.floor(rand() * QUIET.length)]);
      // A settled sky of memories, denser in a loose band (Whitney rows).
      mems = [];
      const n = Math.min(80, Math.floor(cols * rows * 0.06));
      for (let i = 0; i < n; i++) {
        const row = Math.floor(rows * 0.25 + rand() * rows * 0.7);
        mems.push({ col: Math.floor(rand() * cols), row: Math.min(rows - 1, row), type: TYPES[Math.floor(rand() * TYPES.length)], born: -1e9 });
      }
    };

    const freeCell = () => {
      for (let tries = 0; tries < 50; tries++) {
        const col = 2 + Math.floor(rand() * (cols - 4));
        const row = Math.floor(rows * 0.35 + rand() * rows * 0.55);
        if (!mems.some((m) => m.col === col && m.row === row)) return { col, row };
      }
      return { col: Math.floor(cols / 2), row: rows - 2 };
    };

    const enterPhase = (i: number, now: number) => {
      phaseIdx = i;
      phaseStart = now;
      setPhase(i);
      onPhase?.(i);
      const p = PHASES[i].id;
      if (p === "retain") {
        // drop faded ones, add three new memories that fall in
        mems = mems.filter((m) => !(m.fading && now - m.fading > 900));
        for (const t of ["preference", "constraint", "goal"] as const) mems.push({ ...freeCell(), type: t, born: now + Math.random() * 400 });
      } else if (p === "recall") {
        lit = [...mems].filter((m) => !m.outline && !m.fading).sort(() => rand() - 0.5).slice(0, 3);
      } else if (p === "supersede") {
        const target = mems.find((m) => m.type === "constraint" && !m.outline) ?? mems[0];
        target.outline = true;
        const col = Math.min(cols - 1, target.col + 1);
        mems.push({ col, row: target.row, type: "constraint", born: now });
      } else if (p === "forget") {
        const victim = mems.find((m) => !m.outline && !m.fading && m.type !== "constraint");
        if (victim) victim.fading = now;
      }
    };

    const draw = (now: number) => {
      ctx.clearRect(0, 0, w, h);
      ctx.font = `12px ${css.getPropertyValue("--font-martian") || "ui-monospace"}, ui-monospace, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const p = PHASES[phaseIdx].id;
      const t = Math.min(1, (now - phaseStart) / 900);
      // quiet glyphs
      ctx.fillStyle = ink3();
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          ctx.globalAlpha = 0.16 + 0.06 * Math.sin(now / 1400 + c * 0.7 + r * 1.3);
          ctx.fillText(quiet[r * cols + c], c * CELL + CELL / 2, r * CELL + CELL / 2);
        }
      }
      // recall lines rise to the answer above the band
      if (p === "recall") {
        ctx.globalAlpha = 0.55 * t;
        ctx.strokeStyle = ink();
        ctx.lineWidth = 1;
        for (const m of lit) {
          const x = m.col * CELL + CELL / 2;
          const y = m.row * CELL + CELL / 2;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + (w / 2 - x) * t, y - (y + 10) * t);
          ctx.stroke();
        }
      }
      // memories
      for (const m of mems) {
        const age = now - m.born;
        if (age < 0) continue;
        const fall = Math.min(1, age / 700);
        const ease = 1 - Math.pow(1 - fall, 3);
        const y = (m.row * CELL) * ease + -CELL * (1 - ease);
        const x = m.col * CELL;
        let alpha = 1;
        if (m.fading) alpha = Math.max(0, 1 - (now - m.fading) / 900);
        const isLit = p === "recall" && lit.includes(m);
        if (p === "recall" && !isLit) alpha *= 0.45;
        ctx.globalAlpha = alpha;
        const s = CELL - 4;
        if (m.outline) {
          ctx.strokeStyle = color(m.type);
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 2.5, y + 2.5, s - 1, s - 1);
          ctx.fillStyle = color(m.type);
        } else {
          ctx.fillStyle = color(m.type);
          ctx.fillRect(x + 2, y + 2, s, s);
          ctx.fillStyle = DARK_INK.has(m.type) ? "#15130f" : "#faf7ef";
        }
        ctx.fillText(GLYPH[m.type], x + CELL / 2, y + CELL / 2 + 0.5);
        if (isLit) {
          ctx.globalAlpha = 0.35 + 0.35 * Math.sin(now / 180);
          ctx.strokeStyle = ink();
          ctx.strokeRect(x, y, CELL, CELL);
        }
      }
      ctx.globalAlpha = 1;
    };

    const loop = (now: number) => {
      if (now - phaseStart > PHASES[phaseIdx].ms) enterPhase((phaseIdx + 1) % PHASES.length, now);
      draw(now);
      if (visible) raf = requestAnimationFrame(loop);
    };

    resize();
    const ro = new ResizeObserver(() => {
      resize();
      if (reduce) draw(performance.now());
    });
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !reduce) raf = requestAnimationFrame(loop);
      else cancelAnimationFrame(raf);
    });
    io.observe(canvas);
    if (reduce) {
      enterPhase(1, performance.now());
      phaseStart -= 2000;
      draw(performance.now());
    } else {
      enterPhase(0, performance.now());
      raf = requestAnimationFrame(loop);
    }
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [onPhase]);

  return (
    <div className={className}>
      <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute left-5 top-4 md:left-10">
        <p className="mono-label text-[11px] text-ink">{PHASES[phase].label}</p>
        <p key={phase} className="mt-1 max-w-[46ch] animate-fade-up text-[12.5px] text-ink-2">
          {PHASES[phase].caption}
        </p>
      </div>
      <p className="sr-only">
        Animation: memories are retained as coloured cells, recalled when relevant, superseded when they change, and forgotten on request.
      </p>
    </div>
  );
}
