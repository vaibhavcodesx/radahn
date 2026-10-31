"use client";

import { motion, useScroll, useTransform, MotionValue } from "motion/react";
import React, { useRef, useSyncExternalStore } from "react";

const MANIFESTO_TEXT = "Most assistants forget you between tabs. The rest remember you in secret.";

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

function Word({
  word,
  progress,
  range,
  reduced,
}: {
  word: string;
  progress: MotionValue<number>;
  range: [number, number];
  reduced: boolean;
}) {
  const opacity = useTransform(progress, range, [0.3, 1]);

  if (reduced) {
    return <span className="text-ink">{word}&nbsp;</span>;
  }

  return (
    <motion.span
      style={{ opacity }}
      className="inline-block transition-colors duration-150"
    >
      {word}&nbsp;
    </motion.span>
  );
}

export function ScrollRevealManifesto() {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 0.85", "end 0.4"],
  });

  const words = MANIFESTO_TEXT.split(" ");
  const total = words.length;

  return (
    <section
      ref={containerRef}
      className="flex min-h-[40vh] items-center justify-center px-4 py-24 sm:px-6 md:px-10"
    >
      <div className="mx-auto max-w-[32ch] text-center">
        <p className="mono-label mb-4 text-ink-3">The Premise</p>
        <h2 className="font-serif text-[clamp(30px,4vw,50px)] leading-[1.12] tracking-[-0.015em] text-ink">
          {words.map((word, i) => {
            const start = i / total;
            const end = start + 1 / total;
            return (
              <Word
                key={`${word}-${i}`}
                word={word}
                progress={scrollYProgress}
                range={[start, end]}
                reduced={reduced}
              />
            );
          })}
        </h2>
      </div>
    </section>
  );
}
