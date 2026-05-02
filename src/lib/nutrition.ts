import type { ActivityLevel, Gender } from "@/generated/prisma/enums";

export type DailyNutritionTargets = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  sugarMaxG: number;
  fiberMinG: number;
  sodiumMaxMg: number;
};

export type ConsumedTotals = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  sugarG: number;
  fiberG: number;
  sodiumMg: number;
};

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  ACTIVE: 1.725,
  VERY_ACTIVE: 1.9,
};

export function computeAge(birthDate: Date, ref: Date = new Date()) {
  let age = ref.getFullYear() - birthDate.getFullYear();
  const m = ref.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return Math.max(0, age);
}

export function computeBmr(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: Gender,
) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === "MALE" ? base + 5 : base - 161;
}

export function computeDailyTargets(params: {
  weightKg: number;
  heightCm: number;
  birthDate: Date;
  gender: Gender;
  activityLevel: ActivityLevel;
}): DailyNutritionTargets {
  const age = computeAge(params.birthDate);
  const bmr = computeBmr(
    params.weightKg,
    params.heightCm,
    age,
    params.gender,
  );
  const tdee = bmr * ACTIVITY_FACTOR[params.activityLevel];
  const proteinG = Math.round(params.weightKg * 1.2 * 10) / 10;
  const fatKcalTarget = tdee * 0.28;
  const fatG = Math.round((fatKcalTarget / 9) * 10) / 10;
  const proteinKcal = proteinG * 4;
  const carbKcal = Math.max(0, tdee - proteinKcal - fatG * 9);
  const carbsG = Math.round((carbKcal / 4) * 10) / 10;

  return {
    calories: Math.round(tdee),
    proteinG,
    carbsG,
    fatG,
    sugarMaxG: 50,
    fiberMinG: 28,
    sodiumMaxMg: 2300,
  };
}

export function sumConsumed(logs: ConsumedTotals[]): ConsumedTotals {
  return logs.reduce(
    (a, x) => ({
      calories: a.calories + x.calories,
      proteinG: a.proteinG + x.proteinG,
      carbsG: a.carbsG + x.carbsG,
      fatG: a.fatG + x.fatG,
      sugarG: a.sugarG + x.sugarG,
      fiberG: a.fiberG + x.fiberG,
      sodiumMg: a.sodiumMg + x.sodiumMg,
    }),
    {
      calories: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      sugarG: 0,
      fiberG: 0,
      sodiumMg: 0,
    },
  );
}

export function remainingFromTargets(
  targets: DailyNutritionTargets,
  consumed: ConsumedTotals,
) {
  return {
    calories: Math.round(targets.calories - consumed.calories),
    proteinG: Math.round((targets.proteinG - consumed.proteinG) * 10) / 10,
    carbsG: Math.round((targets.carbsG - consumed.carbsG) * 10) / 10,
    fatG: Math.round((targets.fatG - consumed.fatG) * 10) / 10,
    sugarG: Math.round((targets.sugarMaxG - consumed.sugarG) * 10) / 10,
    fiberG: Math.round((targets.fiberMinG - consumed.fiberG) * 10) / 10,
    sodiumMg: Math.round(targets.sodiumMaxMg - consumed.sodiumMg),
  };
}

export type AgentExpression =
  | "neutral"
  | "happy"
  | "thinking"
  | "worried"
  | "warn"
  | "celebrate";

export function expressionFromRemainder(
  targets: DailyNutritionTargets,
  remainder: ReturnType<typeof remainingFromTargets>,
): AgentExpression {
  const consumedCalories = targets.calories - remainder.calories;
  const dayProgress =
    consumedCalories / Math.max(1, targets.calories);
  const dayStarted = dayProgress >= 0.15;

  const overCal = remainder.calories < -150;
  const overSugar = remainder.sugarG < -8;
  const overSodium = remainder.sodiumMg < -350;
  if (overCal || overSugar || overSodium) {
    return "warn";
  }

  const proteinShort =
    dayStarted &&
    remainder.proteinG > Math.max(8, targets.proteinG * 0.22);
  const fiberShort = dayStarted && remainder.fiberG > 10;
  if (proteinShort || fiberShort) {
    return "worried";
  }

  const proteinTight =
    remainder.proteinG >= -0.12 * targets.proteinG &&
    remainder.proteinG <= 0.18 * targets.proteinG;
  const fiberTight = remainder.fiberG <= 6;
  const calTight =
    remainder.calories >= -80 && remainder.calories <= targets.calories * 0.25;
  if (proteinTight && fiberTight && calTight) {
    return "celebrate";
  }

  if (remainder.calories > targets.calories * 0.35) {
    return "happy";
  }

  return "neutral";
}
