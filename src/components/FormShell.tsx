import type { ReactNode } from "react";

export function FormShell({
  title,
  subtitle,
  wide,
  children,
}: {
  title: string;
  subtitle?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  const mw = wide ? "max-w-lg" : "max-w-[26rem]";
  return (
    <div className="min-h-full px-4 py-14 sm:py-20">
      <div
        className={`glass-panel-strong mx-auto w-full rounded-2xl ${mw} px-8 py-10 ring-1 ring-[var(--app-line)]`}
      >
        <header className="mb-8">
          <h1 className="font-serif text-[1.65rem] font-medium tracking-tight text-[var(--app-ink)]">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-sm leading-relaxed text-[var(--app-muted)]">
              {subtitle}
            </p>
          ) : null}
        </header>
        {children}
      </div>
    </div>
  );
}
