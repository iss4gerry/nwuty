"use client";

import type { MealAnalysis } from "@/lib/food-analysis";
import type { TodayData } from "@/lib/today";
import type {
  AgentExpression,
  ConsumedTotals,
  DailyNutritionTargets,
} from "@/lib/nutrition";
import { AgentAvatar } from "@/components/AgentAvatar";
import { NutrientMeter } from "@/components/NutrientMeter";
import { resolveAgentCaption } from "@/lib/agent-message";
import gsap from "gsap";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

type PreviewState = {
  analysis: MealAnalysis;
  preview: {
    remainderAfter: Record<string, number>;
    expression: AgentExpression;
  };
};

export function DashboardClient({ initial }: { initial: TodayData }) {
  const [data, setData] = useState(initial);
  const [foodName, setFoodName] = useState("");
  const [portion, setPortion] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyPhase, setBusyPhase] = useState<
    "identify" | "analyze" | "save" | null
  >(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [imagePipeline, setImagePipeline] = useState(false);

  const revealRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const portionRef = useRef(portion);
  useEffect(() => {
    portionRef.current = portion;
  }, [portion]);

  const displayExpression: AgentExpression = busy ? "thinking" : data.expression;
  const c = data.consumed;
  const t = data.targets;

  const agentCaption = resolveAgentCaption({
    busy,
    busyPhase,
    preview: preview ? { analysis: preview.analysis } : null,
    foodName,
    portion,
    data,
  });

  useLayoutEffect(() => {
    const root = revealRef.current;
    if (!root) return;
    const sections = root.querySelectorAll<HTMLElement>("[data-dash-section]");
    if (sections.length === 0) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        sections,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.08,
          ease: "power2.out",
          overwrite: "auto",
        },
      );
    }, root);
    return () => ctx.revert();
  }, []);

  useLayoutEffect(() => {
    const el = captionRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0.3, y: 4 },
        { opacity: 1, y: 0, duration: 0.35, ease: "power2.out", overwrite: "auto" },
      );
    }, el);
    return () => ctx.revert();
  }, [agentCaption]);

  const handleImageSelected = async (file: File | null) => {
    if (!file) return;
    setErr(null);
    setImagePipeline(true);
    setBusy(true);
    setBusyPhase("identify");
    setPreview(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(new Error("read"));
        r.readAsDataURL(file);
      });
      const mimeMatch = dataUrl.match(/^data:([^;]+);base64,/);
      const mime = mimeMatch?.[1] ?? file.type;
      const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowed.includes(mime)) {
        throw new Error("Use JPG, PNG, WebP, or GIF.");
      }
      const res = await fetch("/api/food/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: dataUrl,
          mimeType: mime,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Could not identify food");
      const foodNameStr = String(j.foodName ?? "").trim();
      if (!foodNameStr) {
        throw new Error("No dish name could be read from the photo.");
      }
      setFoodName(foodNameStr);

      const portionOpt = portionRef.current.trim() || undefined;
      setBusyPhase("analyze");
      const res2 = await fetch("/api/food/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          foodName: foodNameStr,
          portion: portionOpt,
        }),
      });
      const j2 = await res2.json();
      if (!res2.ok) throw new Error(j2.error ?? "Analysis failed");
      setPreview({
        analysis: j2.analysis,
        preview: j2.preview,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Photo entry failed");
      setPreview(null);
    } finally {
      setBusy(false);
      setBusyPhase(null);
      setImagePipeline(false);
    }
  };

  const handleTextAnalyze = async () => {
    setErr(null);
    const name = foodName.trim();
    if (!name) {
      setErr("Enter a dish name first.");
      return;
    }
    setBusy(true);
    setBusyPhase("analyze");
    setPreview(null);
    try {
      const res = await fetch("/api/food/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          foodName: name,
          portion: portion.trim() || undefined,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Analysis failed");
      setPreview({
        analysis: j.analysis,
        preview: j.preview,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setBusy(false);
      setBusyPhase(null);
    }
  };

  const handleLog = async () => {
    if (!preview) return;
    setErr(null);
    setBusy(true);
    setBusyPhase("save");
    try {
      const a = preview.analysis;
      const res = await fetch("/api/food/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: foodName.trim(),
          calories: a.calories,
          proteinG: a.proteinG,
          carbsG: a.carbsG,
          fatG: a.fatG,
          sugarG: a.sugarG,
          fiberG: a.fiberG,
          sodiumMg: a.sodiumMg,
          coachNote: a.coachNote,
          agentMood: a.agentMood,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Could not save");
      if (j.today) setData(j.today as TodayData);
      setPreview(null);
      setFoodName("");
      setPortion("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
      setBusyPhase(null);
    }
  };

  return (
    <div className="min-h-full">
      <div
        ref={revealRef}
        className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-10 md:flex-row md:gap-14 md:px-8 md:py-14"
      >
        <aside
          data-dash-section
          className="flex w-full shrink-0 flex-col gap-6 md:sticky md:top-10 md:w-[19rem]"
        >
          <div className="relative">
            <div className="pointer-events-none absolute -inset-3 rounded-3xl bg-[radial-gradient(ellipse_at_50%_80%,rgba(116,69,119,0.12),transparent_65%)] blur-sm" />
            <div className="glass-panel-strong relative overflow-hidden rounded-2xl p-1.5 ring-1 ring-[var(--app-line)]">
              <AgentAvatar
                expression={displayExpression}
                className="aspect-[4/5] w-full rounded-[0.875rem]"
              />
            </div>
          </div>
          <blockquote className="glass-panel relative rounded-2xl border-0 px-5 py-5 shadow-[0_0_40px_-18px_rgba(116,69,119,0.25)]">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--app-accent)]">
              Mayu
            </p>
            <p
              ref={captionRef}
              className="mt-3 text-sm leading-[1.65] text-[var(--app-ink)] text-pretty"
            >
              {agentCaption}
            </p>
          </blockquote>
          <div className="flex gap-6 text-sm text-[var(--app-muted)]">
            <Link
              href="/profile"
              className="transition-colors hover:text-[var(--app-accent)]"
            >
              Profile
            </Link>
            <button
              type="button"
              className="transition-colors hover:text-[var(--app-ink)]"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              Log out
            </button>
          </div>
        </aside>

        <main data-dash-section className="min-w-0 flex-1 space-y-11">
          {err ? (
            <div
              role="alert"
              className="rounded-xl border border-[#c4a8b8] bg-[rgba(255,255,255,0.9)] px-4 py-3 text-sm text-[#6b2f3d]"
            >
              {err}
            </div>
          ) : null}

          <section>
            <h2 className="mb-5 font-serif text-xl font-medium tracking-tight text-[var(--app-ink)]">
              Today&apos;s progress
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <NutrientMeter
                label="Calories"
                consumed={c.calories}
                target={t.calories}
                unit="kcal"
                barClass="bg-gradient-to-r from-[#5c8f72] to-[#7d9e8e]"
                staggerIndex={0}
              />
              <NutrientMeter
                label="Protein"
                consumed={c.proteinG}
                target={t.proteinG}
                unit="g"
                barClass="bg-gradient-to-r from-[#4a8a9e] to-[#6ba5a8]"
                staggerIndex={1}
              />
              <NutrientMeter
                label="Carbs"
                consumed={c.carbsG}
                target={t.carbsG}
                unit="g"
                barClass="bg-gradient-to-r from-[#5a7a9c] to-[#7b93b5]"
                staggerIndex={2}
              />
              <NutrientMeter
                label="Fat"
                consumed={c.fatG}
                target={t.fatG}
                unit="g"
                barClass="bg-gradient-to-r from-[#a88b5c] to-[#c9a962]"
                staggerIndex={3}
              />
              <NutrientMeter
                label="Sugar"
                consumed={c.sugarG}
                target={t.sugarMaxG}
                unit="g"
                barClass="bg-gradient-to-r from-[#9a5c68] to-[#b87882]"
                staggerIndex={4}
              />
              <NutrientMeter
                label="Fiber"
                consumed={c.fiberG}
                target={t.fiberMinG}
                unit="g"
                barClass="bg-gradient-to-r from-[#6d8f5c] to-[#8faa7a]"
                staggerIndex={5}
              />
              <div className="sm:col-span-2">
                <NutrientMeter
                  label="Sodium"
                  consumed={c.sodiumMg}
                  target={t.sodiumMaxMg}
                  unit="mg"
                  barClass="bg-gradient-to-r from-[#6b5a8f] to-[#8b7aad]"
                  staggerIndex={6}
                />
              </div>
            </div>
          </section>

          <section className="relative overflow-hidden rounded-[1.35rem] glass-panel p-6 sm:p-8">
            <div className="pointer-events-none absolute -right-16 top-0 h-40 w-40 rounded-full bg-[var(--app-accent-soft)] blur-3xl" />
            <div className="relative">
              <h2 className="font-serif text-xl font-medium tracking-tight text-[var(--app-ink)]">
                New entry
              </h2>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-[var(--app-muted)]">
                Use a photo (auto-analysis) or type the dish—same nutrition
                estimate, then save to your log.
              </p>

              <div className="mt-7 flex flex-col gap-8 lg:flex-row lg:items-stretch lg:gap-6">
                <div className="relative min-h-[11rem] flex-1 lg:min-h-[13rem]">
                  <label className="flex h-full min-h-[11rem] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--app-line)] bg-[rgba(255,255,255,0.6)] px-4 py-8 transition-all hover:border-[rgba(116,69,119,0.45)] hover:bg-[rgba(255,255,255,0.85)] lg:min-h-[13rem]">
                    <span className="text-sm font-medium text-[var(--app-ink)]">
                      Upload food photo
                    </span>
                    <span className="mt-1 text-center text-xs text-[var(--app-muted)]">
                      JPG · PNG · WebP · GIF
                      <span className="mt-1 block font-normal text-[var(--app-muted)]/90">
                        We read the dish, then analyze macros automatically.
                      </span>
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      disabled={busy}
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        const input = e.currentTarget;
                        void handleImageSelected(f).finally(() => {
                          input.value = "";
                        });
                      }}
                    />
                  </label>
                  {busy && imagePipeline ? (
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-[rgba(243,241,235,0.88)] backdrop-blur-[3px]"
                      aria-live="polite"
                    >
                      <div
                        className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--app-accent)] border-t-transparent"
                        aria-hidden
                      />
                      <p className="text-center text-xs font-semibold text-[var(--app-accent)]">
                        {busyPhase === "identify"
                          ? "Reading your photo…"
                          : "Estimating nutrition…"}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center gap-3 lg:flex-col lg:justify-center lg:px-1 lg:py-4">
                  <div className="h-px flex-1 bg-[var(--app-line)] lg:h-full lg:w-px lg:flex-initial lg:self-stretch" />
                  <span className="shrink-0 text-[0.7rem] font-bold uppercase tracking-[0.2em] text-[var(--app-muted)]">
                    or
                  </span>
                  <div className="h-px flex-1 bg-[var(--app-line)] lg:h-full lg:w-px lg:flex-initial lg:self-stretch" />
                </div>

                <div className="flex flex-1 flex-col gap-3">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[var(--app-muted)]">
                    Type the meal
                  </p>
                  <input
                    className="input-field"
                    placeholder="Dish name"
                    value={foodName}
                    disabled={busy}
                    autoComplete="off"
                    onChange={(e) => setFoodName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleTextAnalyze();
                      }
                    }}
                  />
                  <input
                    className="input-field"
                    placeholder="Portion (optional, e.g. 1 bowl)"
                    value={portion}
                    disabled={busy}
                    autoComplete="off"
                    onChange={(e) => setPortion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleTextAnalyze();
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={busy || !foodName.trim()}
                    onClick={() => void handleTextAnalyze()}
                    className="btn-primary w-full sm:w-auto sm:self-start"
                  >
                    Analyze nutrition
                  </button>
                </div>
              </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {preview ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleLog()}
                  className="btn-secondary"
                >
                  Save to log
                </button>
              ) : null}
            </div>

            {preview ? (
              <div className="mt-6 border-t border-[var(--app-line)] pt-6">
                <PreviewNutrition
                  a={preview.analysis}
                  targets={t}
                  after={addConsumed(c, preview.analysis)}
                />
              </div>
            ) : null}
            </div>
          </section>

          <section>
            <h2 className="mb-5 font-serif text-xl font-medium tracking-tight text-[var(--app-ink)]">
              Today&apos;s log
            </h2>
            {data.logs.length === 0 ? (
              <p className="text-sm text-[var(--app-muted)]">
                No entries yet.
              </p>
            ) : (
              <ul className="glass-panel divide-y divide-[var(--app-line)] overflow-hidden rounded-2xl ring-1 ring-[var(--app-line)]">
                {data.logs.map((log) => (
                  <li
                    key={log.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
                  >
                    <span className="font-medium text-[var(--app-ink)]">
                      {log.name}
                    </span>
                    <span className="text-xs tabular-nums text-[var(--app-muted)]">
                      {Math.round(log.calories)} kcal · {log.proteinG}g protein ·{" "}
                      {log.carbsG}g carbs · {log.fatG}g fat
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

function addConsumed(
  base: ConsumedTotals,
  meal: Pick<
    MealAnalysis,
    | "calories"
    | "proteinG"
    | "carbsG"
    | "fatG"
    | "sugarG"
    | "fiberG"
    | "sodiumMg"
  >,
): ConsumedTotals {
  return {
    calories: base.calories + meal.calories,
    proteinG: base.proteinG + meal.proteinG,
    carbsG: base.carbsG + meal.carbsG,
    fatG: base.fatG + meal.fatG,
    sugarG: base.sugarG + meal.sugarG,
    fiberG: base.fiberG + meal.fiberG,
    sodiumMg: base.sodiumMg + meal.sodiumMg,
  };
}

function PreviewNutrition({
  a,
  targets,
  after,
}: {
  a: MealAnalysis;
  targets: DailyNutritionTargets;
  after: ConsumedTotals;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-[var(--app-ink)]">
        After this entry
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <NutrientMeter
          label="Calories"
          consumed={after.calories}
          target={targets.calories}
          unit="kcal"
          barClass="bg-gradient-to-r from-[#5c8f72] to-[#7d9e8e]"
          staggerIndex={0}
        />
        <NutrientMeter
          label="Protein"
          consumed={after.proteinG}
          target={targets.proteinG}
          unit="g"
          barClass="bg-gradient-to-r from-[#4a8a9e] to-[#6ba5a8]"
          staggerIndex={1}
        />
        <NutrientMeter
          label="Carbs"
          consumed={after.carbsG}
          target={targets.carbsG}
          unit="g"
          barClass="bg-gradient-to-r from-[#5a7a9c] to-[#7b93b5]"
          staggerIndex={2}
        />
        <NutrientMeter
          label="Fat"
          consumed={after.fatG}
          target={targets.fatG}
          unit="g"
          barClass="bg-gradient-to-r from-[#a88b5c] to-[#c9a962]"
          staggerIndex={3}
        />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-[var(--app-muted)] sm:grid-cols-3">
        <div>
          <dt className="text-[var(--app-muted)]">This entry (kcal)</dt>
          <dd className="tabular-nums">{Math.round(a.calories)}</dd>
        </div>
        <div>
          <dt className="text-[var(--app-muted)]">Sugar</dt>
          <dd className="tabular-nums">{a.sugarG} g</dd>
        </div>
        <div>
          <dt className="text-[var(--app-muted)]">Fiber</dt>
          <dd className="tabular-nums">{a.fiberG} g</dd>
        </div>
        <div className="col-span-2 sm:col-span-3">
          <dt className="text-[var(--app-muted)]">Sodium</dt>
          <dd className="tabular-nums">
            {Math.round(a.sodiumMg).toLocaleString("en-US")} mg
          </dd>
        </div>
      </dl>
    </div>
  );
}
