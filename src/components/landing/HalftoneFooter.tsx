"use client";

import Link from "next/link";
import React, { useEffect, useRef } from "react";
import { MEMORY_TYPE_LIST, MEMORY_TYPE_META } from "@/lib/memory-types";

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((hex || "").trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function parseCssColor(colorStr: string): [number, number, number] {
  if (colorStr.startsWith("#")) {
    return parseHex(colorStr) || [138, 132, 119];
  }
  const rgb = colorStr.match(/\d+/g);
  if (rgb && rgb.length >= 3) {
    return [parseInt(rgb[0], 10), parseInt(rgb[1], 10), parseInt(rgb[2], 10)];
  }
  return [138, 132, 119];
}

function calcRadius(coverage: number, gap: number): number {
  const c = Math.max(0, Math.min(1, coverage));
  return Math.sqrt(c) * gap * 0.56;
}

function stepDot(
  x: number,
  y: number,
  vx: number,
  vy: number,
  hx: number,
  hy: number,
  px: number,
  py: number,
  r: number,
): [number, number, number, number] {
  const dx = x - px;
  const dy = y - py;
  const d2 = dx * dx + dy * dy;
  if (r > 0 && d2 < r * r) {
    const d = Math.sqrt(d2) + 0.001;
    const f = (1 - d / r) * 2.6;
    vx += (dx / d) * f;
    vy += (dy / d) * f;
  }
  vx = (vx + (hx - x) * 0.05) * 0.84;
  vy = (vy + (hy - y) * 0.05) * 0.84;
  return [x + vx, y + vy, vx, vy];
}

interface HalftoneFooterProps {
  wordmark?: string;
  dotGap?: number;
  radius?: number;
}

export function HalftoneFooter({
  wordmark = "RADAHN",
  dotGap = 6,
  radius = 85,
}: HalftoneFooterProps) {
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let px = -1e5;
    let py = -1e5;
    let raf = 0;
    let visible = true;
    let awake = true;
    let ring = { x: 0, y: 0, t: -1 };
    let dots = new Float32Array(0);
    let count = 0;

    let inkColor: [number, number, number] = [138, 132, 119]; // --ink-3
    let warmColor: [number, number, number] = [242, 193, 46]; // --t-preference

    const updateColors = () => {
      const style = getComputedStyle(document.documentElement);
      const inkVal = style.getPropertyValue("--ink-3").trim();
      const warmVal = style.getPropertyValue("--t-preference").trim();
      if (inkVal) inkColor = parseCssColor(inkVal);
      if (warmVal) warmColor = parseCssColor(warmVal);
    };

    updateColors();

    const layout = () => {
      updateColors();
      const rect = root.getBoundingClientRect();
      w = Math.max(1, Math.round(rect.width));
      h = Math.max(1, Math.round(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);

      // Render wordmark mask at 1x
      const mask = document.createElement("canvas");
      mask.width = w;
      mask.height = h;
      const m = mask.getContext("2d", { willReadFrequently: true });
      if (!m) return;

      const fontFamily = 'Hedvig Letters Serif, "Georgia", serif';
      m.font = `800 100px ${fontFamily}`;
      const measured = m.measureText(wordmark).width;
      // Fit the whole word between the top row (~96 px) and the copyright row (~72 px): limited by
      // width or by the free height, whichever is tighter, so no letter is cut off or under text.
      const top = 96, bottom = w < 640 ? 64 : 72;
      const fitW = measured > 0 ? (w * 0.94 / measured) * 100 : 80;
      const fitH = Math.max(40, (h - top - bottom) / 0.74);
      const fit = Math.min(fitW, fitH);
      m.font = `800 ${fit}px ${fontFamily}`;
      const box = m.measureText(wordmark);

      m.fillStyle = "#000";
      m.textBaseline = "alphabetic";
      m.fillText(wordmark, (w - box.width) / 2, h - bottom);
      const img = m.getImageData(0, 0, w, h).data;

      const gap = Math.max(4, dotGap);
      const cols = Math.ceil(w / gap);
      const rows = Math.ceil(h / gap);
      const tmp: number[] = [];

      for (let gy = 0; gy < rows; gy++) {
        for (let gx = 0; gx < cols; gx++) {
          let sum = 0;
          for (let sy = 0; sy < 3; sy++) {
            for (let sx = 0; sx < 3; sx++) {
              const sxPos = Math.min(w - 1, Math.floor(gx * gap + ((sx + 0.5) * gap) / 3));
              const syPos = Math.min(h - 1, Math.floor(gy * gap + ((sy + 0.5) * gap) / 3));
              sum += img[(syPos * w + sxPos) * 4 + 3];
            }
          }
          const cov = sum / (9 * 255);
          if (cov < 0.05) continue;
          const hx = gx * gap + gap / 2;
          const hy = gy * gap + gap / 2;
          tmp.push(hx, hy, 0, 0, hx, hy, calcRadius(cov, gap));
        }
      }

      dots = new Float32Array(tmp);
      count = tmp.length / 7;
      awake = true;
    };

    const draw = (now: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const r = !reduced ? Math.max(0, radius) : 0;
      const ringAge = ring.t < 0 ? 1e9 : now - ring.t;
      const ringR = ringAge * 0.9;
      let moving = false;

      for (let i = 0; i < count; i++) {
        const j = i * 7;
        let x = dots[j];
        let y = dots[j + 1];
        let vx = dots[j + 2];
        let vy = dots[j + 3];
        const hx = dots[j + 4];
        const hy = dots[j + 5];

        if (!reduced) {
          if (ringAge < 900) {
            const dx = hx - ring.x;
            const dy = hy - ring.y;
            const d = Math.sqrt(dx * dx + dy * dy) + 0.001;
            const band = 1 - Math.min(1, Math.abs(d - ringR) / 26);
            if (band > 0) {
              const f = band * 3.2 * (1 - ringAge / 900);
              vx += (dx / d) * f;
              vy += (dy / d) * f;
            }
          }
          const s = stepDot(x, y, vx, vy, hx, hy, px, py, r);
          x = s[0];
          y = s[1];
          vx = s[2];
          vy = s[3];
          if (Math.abs(vx) + Math.abs(vy) > 0.02 || Math.abs(x - hx) + Math.abs(y - hy) > 0.05) {
            moving = true;
          } else {
            x = hx;
            y = hy;
            vx = 0;
            vy = 0;
          }
          dots[j] = x;
          dots[j + 1] = y;
          dots[j + 2] = vx;
          dots[j + 3] = vy;
        }

        const dist = Math.hypot(x - hx, y - hy);
        const k = Math.min(1, dist / 28);
        if (k > 0.03) {
          const red = Math.round(inkColor[0] + (warmColor[0] - inkColor[0]) * k);
          const green = Math.round(inkColor[1] + (warmColor[1] - inkColor[1]) * k);
          const blue = Math.round(inkColor[2] + (warmColor[2] - inkColor[2]) * k);
          ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
        } else {
          ctx.fillStyle = `rgb(${inkColor[0]}, ${inkColor[1]}, ${inkColor[2]})`;
        }

        ctx.beginPath();
        ctx.arc(x, y, dots[j + 6], 0, Math.PI * 2);
        ctx.fill();
      }

      awake = moving || ringAge < 900 || px > -1e4;
    };

    const loop = (now: number) => {
      raf = 0;
      if (!visible) return;
      draw(now);
      if (awake) raf = requestAnimationFrame(loop);
    };

    const wake = () => {
      awake = true;
      if (!raf && visible) raf = requestAnimationFrame(loop);
    };

    const toLocal = (e: PointerEvent): [number, number] => {
      const b = canvas.getBoundingClientRect();
      return [e.clientX - b.left, e.clientY - b.top];
    };

    const onMove = (e: PointerEvent) => {
      const p = toLocal(e);
      px = p[0];
      py = p[1];
      wake();
    };

    const onLeave = () => {
      px = -1e5;
      py = -1e5;
      wake();
    };

    const onDown = (e: PointerEvent) => {
      if (reduced) return;
      if ((e.target as HTMLElement).closest("a, button")) return;
      const p = toLocal(e);
      ring = { x: p[0], y: p[1], t: performance.now() };
      wake();
    };

    layout();
    draw(performance.now());
    wake();

    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    root.addEventListener("pointerdown", onDown);

    const ro = new ResizeObserver(() => {
      layout();
      wake();
    });
    ro.observe(root);

    const io = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? true;
      if (visible) wake();
    });
    io.observe(root);

    // Re-layout if theme changes
    const mo = new MutationObserver(() => {
      layout();
      wake();
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        layout();
        wake();
      });
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("pointerdown", onDown);
    };
  }, [wordmark, dotGap, radius]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer
      ref={rootRef}
      className="relative w-full overflow-hidden border-t border-line bg-canvas px-4 pb-8 pt-12 sm:px-6 md:px-10"
    >
      {/* Halftone Canvas Background */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 size-full select-none"
      />

      {/* Screen reader fallback for the giant halftone wordmark */}
      <span className="sr-only">{wordmark}</span>

      {/* Content Layer (on top of canvas) */}
      <div className="relative z-10 flex flex-col justify-between">
        <div className="flex flex-wrap items-start justify-between gap-8">
          <div className="flex gap-1.5" aria-hidden="true">
            {MEMORY_TYPE_LIST.map((t) => (
              <span
                key={t}
                className="size-3 rounded-[2px]"
                style={{ background: `var(${MEMORY_TYPE_META[t].colorVar})` }}
              />
            ))}
          </div>

          <nav className="flex items-center gap-6 text-[14.5px] text-ink-2">
            <Link href="/how-it-works" className="transition-colors hover:text-ink">
              How it works
            </Link>
            <a
              href="https://github.com/vaibhavcodesx/radahn"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-ink"
            >
              GitHub
            </a>
            <button
              type="button"
              onClick={scrollToTop}
              className="mono-label flex items-center gap-1 text-[11px] text-ink-3 transition-colors hover:text-ink"
              aria-label="Scroll back to top"
            >
              Top ↑
            </button>
          </nav>
        </div>

        {/* Height spacer to let the halftone wordmark breathe */}
        <div className="h-44 sm:h-56 md:h-72" aria-hidden="true" />

        <div className="flex flex-col items-start justify-between gap-2 border-t border-line/40 pt-4 sm:flex-row sm:items-center">
          <p className="text-[13px] text-ink-3">© 2026 Radahn. Example content is synthetic.</p>
          <p className="hidden font-mono text-[11.5px] text-ink-3 sm:block">
            Interact: hover or tap to part the dots · click for shockwave
          </p>
        </div>
      </div>
    </footer>
  );
}
