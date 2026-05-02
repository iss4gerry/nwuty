import type { MealAnalysis } from "@/lib/food-analysis";
import type { TodayData } from "@/lib/today";

export function dailyGuidance(data: TodayData): string {
  const { targets, consumed, remainder, logs } = data;
  const chunks: string[] = [];

  const calRatio = consumed.calories / Math.max(1, targets.calories);
  const protRatio = consumed.proteinG / Math.max(0.1, targets.proteinG);
  const fiberRatio = consumed.fiberG / Math.max(0.1, targets.fiberMinG);

  if (logs.length === 0) {
    chunks.push(
      "Your day is still empty—start with one meal whose portion you know well.",
    );
  }

  if (remainder.sugarG < -6) {
    chunks.push(
      "Sugar is already above a relaxed limit; skip sweet drinks and pastries for the rest of the day.",
    );
  }
  if (remainder.sodiumMg < -450) {
    chunks.push(
      "Sodium looks high; pick steamed or grilled foods without instant sauces and ease up on crackers or instant noodles.",
    );
  }
  if (remainder.calories < -180) {
    chunks.push(
      "You're above your calorie target; for your next meal, lean toward brothy vegetables and lean protein with little added oil.",
    );
  }

  const ideas: string[] = [];

  if (remainder.proteinG > Math.max(12, targets.proteinG * 0.18)) {
    ideas.push(
      "tofu & tempeh, boiled eggs, skinless grilled chicken, steamed fish, or plain Greek yogurt",
    );
  }
  if (remainder.fiberG > 7) {
    ideas.push(
      "stir-fried greens, papaya, beans or lentils, steamed squash, or oats on the side",
    );
  }
  if (
    remainder.carbsG > targets.carbsG * 0.2 &&
    calRatio < 0.82 &&
    remainder.calories > targets.calories * 0.15
  ) {
    ideas.push("brown rice, sweet potato, corn on the cob, or whole-wheat bread");
  }
  if (
    remainder.fatG > targets.fatG * 0.22 &&
    remainder.calories > targets.calories * 0.12
  ) {
    ideas.push(
      "a little avocado, oily fish, or a handful of unsalted nuts",
    );
  }
  if (
    remainder.calories > targets.calories * 0.28 &&
    calRatio < 0.75 &&
    ideas.length < 3
  ) {
    ideas.push(
      "oat porridge, a banana–milk smoothie, or a sandwich packed with vegetables",
    );
  }

  if (ideas.length > 0) {
    chunks.push(
      `To close today's gaps, consider: ${ideas.slice(0, 2).join(" · ")}.`,
    );
  }

  if (
    calRatio >= 0.88 &&
    calRatio <= 1.06 &&
    protRatio >= 0.82 &&
    fiberRatio >= 0.8 &&
    remainder.sugarG >= -3 &&
    remainder.sodiumMg >= -250
  ) {
    return "You're close to your targets—keep rotating vegetables, protein, and plenty of water.";
  }

  if (chunks.length === 0) {
    return "Check the bars: nutrients with the biggest gap left are the smartest to cover next.";
  }

  return chunks.join(" ");
}

export function resolveAgentCaption(params: {
  busy: boolean;
  busyPhase: "identify" | "analyze" | "save" | null;
  preview: { analysis: MealAnalysis } | null;
  foodName: string;
  portion: string;
  data: TodayData;
}): string {
  if (params.busy) {
    if (params.busyPhase === "identify") {
      return "Reading your photo…";
    }
    if (params.busyPhase === "save") {
      return "Saving to today's log…";
    }
    return "Estimating nutrition…";
  }
  if (params.preview) {
    const name = params.foodName.trim();
    const note = params.preview.analysis.coachNote.trim();
    if (name) {
      return `About “${name}”: ${note}`;
    }
    return note;
  }
  const fn = params.foodName.trim();
  if (fn) {
    const po = params.portion.trim();
    return `Tap “Analyze nutrition” for one serving of “${fn}”${po ? ` (${po})` : ""}.`;
  }
  return dailyGuidance(params.data);
}
