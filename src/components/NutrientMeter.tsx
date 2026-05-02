"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";

export function NutrientMeter({
  label,
  consumed,
  target,
  unit,
  barClass,
  staggerIndex = 0,
}: {
  label: string;
  consumed: number;
  target: number;
  unit: string;
  barClass: string;
  staggerIndex?: number;
}) {
  const fillRef = useRef<HTMLDivElement>(null);
  const barReady = useRef(false);

  const safeTarget = target > 0 ? target : 1;
  const ratio = consumed / safeTarget;
  const widthPct = Math.min(100, ratio * 100);
  const over = ratio > 1.001;

  const displayConsumed =
    unit === "mg"
      ? Math.round(consumed).toLocaleString("en-US")
      : Number.isInteger(consumed)
        ? consumed
        : consumed.toFixed(1);
  const displayTarget =
    unit === "mg"
      ? Math.round(target).toLocaleString("en-US")
      : Number.isInteger(target)
        ? target
        : target.toFixed(1);

  const pctDisplay = Math.round(ratio * 100);

  useEffect(() => {
    const fill = fillRef.current;
    if (!fill) return;
    gsap.killTweensOf(fill);
    const delay = barReady.current ? 0 : staggerIndex * 0.07;
    barReady.current = true;
    gsap.to(fill, {
      width: `${widthPct}%`,
      duration: 1.05,
      ease: "power3.out",
      delay,
    });
  }, [widthPct, staggerIndex]);

  return (
    <div className="group relative overflow-hidden rounded-2xl border-0 bg-[var(--app-surface)] px-4 py-4 ring-1 ring-[var(--app-line)] backdrop-blur-md">
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[var(--app-glow)] opacity-70 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
        aria-hidden
      />
      <div className="relative flex items-baseline justify-between gap-2">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--app-muted)]">
          {label}
        </span>
        <span
          className={`text-xs tabular-nums ${over ? "font-semibold text-[#a94456]" : "text-[var(--app-ink)]"}`}
        >
          {displayConsumed}
          <span className="text-[var(--app-muted)]"> / </span>
          {displayTarget}
          <span className="ml-0.5 text-[0.65rem] font-normal text-[var(--app-muted)]">
            {unit}
          </span>
        </span>
      </div>
      <div className="relative mt-3.5">
        <div
          className="h-3 w-full overflow-hidden rounded-full bg-[rgba(44,38,40,0.07)] shadow-[inset_0_1px_2px_rgba(44,38,40,0.08)] ring-1 ring-[var(--app-line)]"
          role="progressbar"
          aria-valuenow={Math.round(widthPct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
        >
          <div
            ref={fillRef}
            className="relative h-full w-0 min-w-0 rounded-full shadow-[0_0_16px_-2px_rgba(116,69,119,0.35)]"
          >
            <div
              className={`absolute inset-0 rounded-full ${over ? "bg-gradient-to-r from-[#c45c4a] to-[#e0786a]" : barClass}`}
            />
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-[45%] rounded-t-full bg-gradient-to-b from-white/25 to-transparent"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-white/15"
              aria-hidden
            />
          </div>
        </div>
        <p className="mt-1.5 text-right text-[0.65rem] tabular-nums text-[var(--app-muted)]">
          {pctDisplay}% of goal
          {over ? " · over target" : ""}
        </p>
      </div>
    </div>
  );
}
