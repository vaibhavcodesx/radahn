"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Public-page nav bar (design.md §6.1, task A2).
 * Sticky with backdrop on scroll. Mobile: logo + CTA, links in a menu.
 */
export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 flex items-center justify-between px-4 py-3 transition-[background,box-shadow] duration-200 sm:px-6 md:px-10 ${
        scrolled
          ? "bg-canvas/85 shadow-[0_1px_0_var(--line)] backdrop-blur-md"
          : "bg-transparent"
      }`}
    >
      <Link
        href="/"
        className="group flex min-h-[44px] items-center gap-2.5 transition-opacity hover:opacity-95"
        aria-label="Radahn home"
      >
        <span className="flex size-[38px] items-center justify-center rounded-[8px] border border-line bg-surface/80 p-0.5 shadow-card transition-colors group-hover:border-line-strong">
          <Image
            src="/brand/radahn-mark.png"
            alt=""
            width={32}
            height={32}
            className="size-8 rounded-[6px]"
            priority
          />
        </span>
        <span className="font-sans text-[19.5px] font-semibold tracking-[-0.015em] text-ink">
          Radahn
        </span>
      </Link>

      <nav className="flex items-center gap-2 sm:gap-6">
        {/* Desktop links */}
        <Link
          href="/how-it-works"
          className="hidden text-[14px] text-ink-2 transition-colors hover:text-ink sm:inline"
        >
          How it works
        </Link>
        <a
          href="https://github.com/vaibhavcodesx/radahn"
          className="hidden text-[14px] text-ink-2 transition-colors hover:text-ink sm:inline"
        >
          GitHub
        </a>
        {/* One entry point: /signin offers both "Continue as guest" and Google. */}
        <Link
          href="/signin"
          className="mono-label inline-flex h-11 items-center gap-2 rounded-full bg-accent px-4 text-accent-ink transition-opacity hover:opacity-90 sm:px-5"
        >
          <span className="hidden sm:inline">Get started — free</span>
          <span className="sm:hidden">Get started</span>
        </Link>

        {/* Mobile menu toggle (tap target >= 44px) */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex size-11 items-center justify-center rounded-control text-ink-2 hover:bg-hover hover:text-ink sm:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="8" x2="20" y2="8" /><line x1="4" y1="16" x2="20" y2="16" />
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="absolute left-0 right-0 top-full border-b border-line bg-canvas/95 px-4 py-3 backdrop-blur-md sm:hidden">
          <div className="flex flex-col">
            <Link
              href="/how-it-works"
              className="flex min-h-[44px] items-center text-[15px] text-ink-2 hover:text-ink"
              onClick={() => setMenuOpen(false)}
            >
              How it works
            </Link>
            <a
              href="https://github.com/vaibhavcodesx/radahn"
              className="flex min-h-[44px] items-center text-[15px] text-ink-2 hover:text-ink"
              onClick={() => setMenuOpen(false)}
            >
              GitHub
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
