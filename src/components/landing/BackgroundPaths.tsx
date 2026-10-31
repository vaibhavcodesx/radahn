"use client";

import { motion } from "motion/react";
import React, { useSyncExternalStore } from "react";

interface PathConfig {
  id: number;
  d: string;
  width: number;
  colorVar: string;
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      if (typeof window === "undefined") return () => {};
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => (typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false),
    () => false,
  );
}

export function BackgroundPaths({ className = "" }: { className?: string }) {
  const reduced = usePrefersReducedMotion();

  const pathTokens = [
    "--ink-3",
    "--t-preference",
    "--t-fact",
    "--t-strategy",
    "--ink-3",
    "--t-goal",
  ];

  // 24 elegant bezier curves across the canvas
  const paths: PathConfig[] = Array.from({ length: 24 }, (_, i) => {
    const p = i % 2 === 0 ? 1 : -1;
    const offset = i * 16;
    return {
      id: i,
      d: `M-${200 - offset} -${100 + i * 8}C${100 + offset * p} ${150 - i * 6} ${300 - offset * p} ${280 + i * 6} ${750 + offset} ${450 + i * 8}`,
      width: 0.6 + (i % 3) * 0.3,
      colorVar: pathTokens[i % pathTokens.length],
    };
  });

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 select-none overflow-hidden ${className}`}
    >
      <svg
        className="size-full opacity-40 [html[data-theme='light']_&]:opacity-25"
        viewBox="0 0 800 400"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        <title>Background Paths</title>
        {paths.map((path) =>
          reduced ? (
            <path
              key={path.id}
              d={path.d}
              stroke={`var(${path.colorVar})`}
              strokeWidth={path.width}
              strokeOpacity={0.12 + (path.id % 4) * 0.03}
            />
          ) : (
            <motion.path
              key={path.id}
              d={path.d}
              stroke={`var(${path.colorVar})`}
              strokeWidth={path.width}
              strokeOpacity={0.12 + (path.id % 4) * 0.03}
              initial={{ pathLength: 0.3, opacity: 0.4 }}
              animate={{
                pathLength: [0.3, 1, 0.3],
                opacity: [0.2, 0.5, 0.2],
                pathOffset: [0, 1, 0],
              }}
              transition={{
                duration: 18 + (path.id % 5) * 3,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          ),
        )}
      </svg>
    </div>
  );
}
