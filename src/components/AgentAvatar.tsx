"use client";

import gsap from "gsap";
import Image from "next/image";
import { useEffect, useRef } from "react";
import type { AgentExpression } from "@/lib/nutrition";

const FILE_MAP: Record<AgentExpression, string> = {
  neutral: "agent-neutral.png",
  happy: "agent-happy.png",
  thinking: "agent-thinking.png",
  worried: "agent-worried.png",
  warn: "agent-warn.png",
  celebrate: "agent-celebrate.png",
};

export function AgentAvatar({
  expression,
  className = "",
}: {
  expression: AgentExpression;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const file = FILE_MAP[expression] ?? FILE_MAP.neutral;
  const src = `/agent/${file}`;

  useEffect(() => {
    const inner = innerRef.current;
    const wrap = wrapRef.current;
    if (!inner || !wrap) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        inner,
        { opacity: 0, scale: 0.97, y: 6 },
        { opacity: 1, scale: 1, y: 0, duration: 0.38, ease: "power2.out" },
      );
    }, wrap);
    return () => ctx.revert();
  }, [expression, src]);

  return (
    <div
      ref={wrapRef}
      className={`relative overflow-hidden bg-gradient-to-b from-[#e8e6e0] to-[#f3f1eb] ${className}`}
    >
      <div ref={innerRef} className="relative h-full w-full">
        <Image
          src={src}
          alt="Mayu"
          fill
          sizes="280px"
          className="object-contain object-bottom"
          unoptimized
          onError={(e) => {
            e.currentTarget.style.opacity = "0";
          }}
        />
      </div>
    </div>
  );
}
