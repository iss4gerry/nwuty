import { prisma } from "@/lib/db";
import { computeBriefInsight } from "@/lib/brief-insight";
import { getLocalDateString, lastNYmdDays } from "@/lib/dates";
import type { ConsumedTotals, DailyNutritionTargets } from "@/lib/nutrition";
import {
  computeDailyTargets,
  expressionFromRemainder,
  remainingFromTargets,
  sumConsumed,
} from "@/lib/nutrition";

function logToConsumed(l: {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  sugarG: number;
  fiberG: number;
  sodiumMg: number;
}) {
  return {
    calories: l.calories,
    proteinG: l.proteinG,
    carbsG: l.carbsG,
    fatG: l.fatG,
    sugarG: l.sugarG,
    fiberG: l.fiberG,
    sodiumMg: l.sodiumMg,
  };
}

const emptyConsumed = (): ConsumedTotals & { logCount: number } => ({
  calories: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
  sugarG: 0,
  fiberG: 0,
  sodiumMg: 0,
  logCount: 0,
});

async function loadBriefInsight(
  userId: string,
  localDate: string,
  targets: DailyNutritionTargets,
) {
  const range = lastNYmdDays(localDate, 7);
  const logs = await prisma.foodLog.findMany({
    where: { userId, localDate: { in: range } },
    select: {
      localDate: true,
      calories: true,
      proteinG: true,
      carbsG: true,
      fatG: true,
      sugarG: true,
      fiberG: true,
      sodiumMg: true,
    },
  });

  const byDate = new Map<string, ConsumedTotals & { logCount: number }>();
  for (const d of range) {
    byDate.set(d, emptyConsumed());
  }
  for (const log of logs) {
    const e = byDate.get(log.localDate);
    if (!e) continue;
    e.calories += log.calories;
    e.proteinG += log.proteinG;
    e.carbsG += log.carbsG;
    e.fatG += log.fatG;
    e.sugarG += log.sugarG;
    e.fiberG += log.fiberG;
    e.sodiumMg += log.sodiumMg;
    e.logCount += 1;
  }

  const perDay = range.map((d) => {
    const row = byDate.get(d)!;
    const { logCount, ...consumed } = row;
    return { localDate: d, consumed, logCount };
  });

  return computeBriefInsight({ targets, perDay });
}

export async function getTodaySnapshot(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });
  if (!user?.profile) return null;

  const localDate = getLocalDateString(user.timezone);
  const targets = computeDailyTargets({
    weightKg: user.profile.weightKg,
    heightCm: user.profile.heightCm,
    birthDate: user.profile.birthDate,
    gender: user.profile.gender,
    activityLevel: user.profile.activityLevel,
  });

  const logs = await prisma.foodLog.findMany({
    where: { userId, localDate },
    orderBy: { createdAt: "desc" },
  });

  const consumed = sumConsumed(logs.map(logToConsumed));
  const remainder = remainingFromTargets(targets, consumed);
  const expression = expressionFromRemainder(targets, remainder);

  const briefInsight = await loadBriefInsight(userId, localDate, targets);

  return {
    timezone: user.timezone,
    localDate,
    targets,
    consumed,
    remainder,
    expression,
    briefInsight,
    logs: logs.map((l) => ({
      id: l.id,
      name: l.name,
      calories: l.calories,
      proteinG: l.proteinG,
      carbsG: l.carbsG,
      fatG: l.fatG,
      sugarG: l.sugarG,
      fiberG: l.fiberG,
      sodiumMg: l.sodiumMg,
      coachNote: l.coachNote,
      createdAt: l.createdAt.toISOString(),
    })),
  };
}

export type TodaySnapshot = Awaited<ReturnType<typeof getTodaySnapshot>>;
export type TodayData = NonNullable<TodaySnapshot>;

/** Remount client when server snapshot meaningfully changes (avoids stale useState after navigation). */
export function todayDataClientKey(d: TodayData): string {
  return [
    d.localDate,
    d.logs.map((l) => l.id).join(","),
    Math.round(d.consumed.calories),
    d.targets.calories,
    d.targets.proteinG,
  ].join("|");
}
