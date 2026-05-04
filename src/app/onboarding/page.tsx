"use client";

import { ActivityLevel, Gender } from "@/generated/prisma/enums";
import { FormShell } from "@/components/FormShell";
import { useRouter } from "next/navigation";
import { useState } from "react";

const activityLabels: Record<ActivityLevel, string> = {
  [ActivityLevel.SEDENTARY]: "Mostly seated · little exercise",
  [ActivityLevel.LIGHT]: "Light · 1–3 days/week",
  [ActivityLevel.MODERATE]: "Moderate · 3–5 days/week",
  [ActivityLevel.ACTIVE]: "Active · 6–7 days/week",
  [ActivityLevel.VERY_ACTIVE]: "Very active · heavy physical work",
};

export default function OnboardingPage() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [heightCm, setHeightCm] = useState(170);
  const [weightKg, setWeightKg] = useState(65);
  const [gender, setGender] = useState<Gender>(Gender.MALE);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    ActivityLevel.MODERATE,
  );

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heightCm,
          weightKg,
          gender,
          activityLevel,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Could not save");
      router.replace("/dashboard");
      queueMicrotask(() => router.refresh());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormShell
      wide
      title="Body profile"
      subtitle="Used to estimate daily energy and macro needs."
    >
      {err ? (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-[rgba(176,90,110,0.35)] bg-[rgba(255,255,255,0.95)] px-3 py-2 text-sm text-[#6b2f3d]"
        >
          {err}
        </div>
      ) : null}

      <div className="space-y-4">
        <label className="block text-sm text-[var(--app-muted)]">
          Height (cm)
          <input
            type="number"
            className="input-field mt-1.5"
            value={heightCm}
            min={50}
            max={260}
            onChange={(e) => setHeightCm(Number(e.target.value))}
          />
        </label>

        <label className="block text-sm text-[var(--app-muted)]">
          Weight (kg)
          <input
            type="number"
            className="input-field mt-1.5"
            value={weightKg}
            min={20}
            max={400}
            step="0.1"
            onChange={(e) => setWeightKg(Number(e.target.value))}
          />
        </label>

        <label className="block text-sm text-[var(--app-muted)]">
          Gender
          <select
            className="input-field mt-1.5"
            value={gender}
            onChange={(e) => setGender(e.target.value as Gender)}
          >
            <option value={Gender.MALE}>Male</option>
            <option value={Gender.FEMALE}>Female</option>
          </select>
        </label>

        <label className="block text-sm text-[var(--app-muted)]">
          Activity level
          <select
            className="input-field mt-1.5"
            value={activityLevel}
            onChange={(e) =>
              setActivityLevel(e.target.value as ActivityLevel)
            }
          >
            {(Object.keys(activityLabels) as ActivityLevel[]).map((k) => (
              <option key={k} value={k}>
                {activityLabels[k]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => void submit()}
        className="btn-primary mt-8 w-full"
      >
        Save and open dashboard
      </button>
    </FormShell>
  );
}
