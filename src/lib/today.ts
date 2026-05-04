import { prisma } from "@/lib/db";
import { getLocalDateString } from "@/lib/dates";
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

  return {
    timezone: user.timezone,
    localDate,
    targets,
    consumed,
    remainder,
    expression,
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
