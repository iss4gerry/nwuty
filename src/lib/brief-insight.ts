import type { ConsumedTotals, DailyNutritionTargets } from "@/lib/nutrition";

export type DayNutritionRow = {
  localDate: string;
  consumed: ConsumedTotals;
  logCount: number;
};

/**
 * One short line from ~7 days of logs + targets (rule-based, no LLM).
 */
export function computeBriefInsight(input: {
  targets: DailyNutritionTargets;
  perDay: DayNutritionRow[];
}): string {
  const { targets, perDay } = input;
  const activeDays = perDay.filter((d) => d.logCount > 0).length;

  if (activeDays < 2) {
    return "Logging on more days—even quick notes—helps spot weekly patterns.";
  }

  const protLowDays = perDay.filter(
    (d) =>
      d.logCount > 0 &&
      d.consumed.proteinG / Math.max(0.1, targets.proteinG) < 0.72,
  ).length;
  const calHighDays = perDay.filter(
    (d) => d.logCount > 0 && d.consumed.calories > targets.calories * 1.08,
  ).length;
  const fiberLowDays = perDay.filter(
    (d) =>
      d.logCount > 0 && d.consumed.fiberG < targets.fiberMinG * 0.65,
  ).length;
  const sugarHighDays = perDay.filter(
    (d) =>
      d.logCount > 0 && d.consumed.sugarG > targets.sugarMaxG + 5,
  ).length;

  if (protLowDays >= 3) {
    return "Protein has run low on several days—add lean protein about the size of your palm at meals.";
  }
  if (calHighDays >= 3) {
    return "Calories have been above target often this week—try one lighter meal or smaller portions.";
  }
  if (sugarHighDays >= 3) {
    return "Sugar's spiked on multiple days—watching drinks and desserts tends to move the needle.";
  }
  if (fiberLowDays >= 3 && activeDays >= 3) {
    return "Fiber's been behind on most logged days—extra vegetables, fruit, or beans help close it.";
  }

  const logged = perDay.filter((d) => d.logCount > 0);
  const avgCal =
    logged.reduce(
      (s, d) => s + d.consumed.calories / Math.max(1, targets.calories),
      0,
    ) / Math.max(1, logged.length);
  const avgProt =
    logged.reduce(
      (s, d) => s + d.consumed.proteinG / Math.max(0.1, targets.proteinG),
      0,
    ) / Math.max(1, logged.length);

  if (activeDays >= 5 && avgProt >= 0.82 && avgCal >= 0.82 && avgCal <= 1.12) {
    return "Solid week of logging—steady entries make your targets much easier to read.";
  }

  return "Watch the meters: the biggest repeated gaps this week are the best place to tweak.";
}
