import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { invokeCoachChat } from "@/lib/bedrock/coach";
import { parseMealAnalysis } from "@/lib/food-analysis";
import { getTodaySnapshot } from "@/lib/today";
import {
  expressionFromRemainder,
  remainingFromTargets,
  sumConsumed,
} from "@/lib/nutrition";

const schema = z.object({
  foodName: z.string().min(1).max(200),
  portion: z.string().max(200).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snap = await getTodaySnapshot(session.user.id);
  if (!snap) {
    return NextResponse.json({ error: "Complete your profile first." }, { status: 400 });
  }

  try {
    const body = schema.parse(await req.json());

    const system = `You are a nutrition expert. Reply ONLY with one valid JSON object (no markdown, no text outside JSON).
Required fields:
- calories, proteinG, carbsG, fatG, sugarG, fiberG, sodiumMg: numbers (estimate for ONE typical serving).
- coachNote: short friendly string in English (max 400 characters) about this portion vs the user's needs today.
- agentMood: optional string, one of: neutral|happy|worried|warn|celebrate|thinking

Use conservative estimates if unsure.`;

    const userMsg = `User's current goal: ${snap.targets.goal}
User's daily targets:
- Calories: ${snap.targets.calories} kcal
- Protein: ${snap.targets.proteinG} g
- Carbs: ${snap.targets.carbsG} g
- Fat: ${snap.targets.fatG} g
- Sugar limit (approx. daily total): ${snap.targets.sugarMaxG} g
- Fiber minimum: ${snap.targets.fiberMinG} g
- Sodium limit: ${snap.targets.sodiumMaxMg} mg

Already logged today (totals):
calories ${snap.consumed.calories}, protein ${snap.consumed.proteinG}g, carbs ${snap.consumed.carbsG}g, fat ${snap.consumed.fatG}g, sugar ${snap.consumed.sugarG}g, fiber ${snap.consumed.fiberG}g, sodium ${snap.consumed.sodiumMg}mg

Remaining before this meal:
calories ${snap.remainder.calories}, protein ${snap.remainder.proteinG}g, carbs ${snap.remainder.carbsG}g, fat ${snap.remainder.fatG}g, sugar ${snap.remainder.sugarG}g, fiber ${snap.remainder.fiberG}g, sodium ${snap.remainder.sodiumMg}mg

Food: ${body.foodName}
Portion / user note: ${body.portion ?? "medium / one home-style serving"}

Estimate nutrition for ONE serving and fill coachNote based on the user's goal.`;

    const raw = await invokeCoachChat(system, userMsg);
    const analysis = parseMealAnalysis(raw);

    const afterConsumed = sumConsumed([
      snap.consumed,
      {
        calories: analysis.calories,
        proteinG: analysis.proteinG,
        carbsG: analysis.carbsG,
        fatG: analysis.fatG,
        sugarG: analysis.sugarG,
        fiberG: analysis.fiberG,
        sodiumMg: analysis.sodiumMg,
      },
    ]);
    const remainderAfter = remainingFromTargets(snap.targets, afterConsumed);
    const expression = expressionFromRemainder(snap.targets, remainderAfter);

    return NextResponse.json({
      analysis,
      preview: {
        remainderAfter,
        expression,
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request.", issues: e.flatten() },
        { status: 400 },
      );
    }
    console.error(e);
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Could not analyze this food.",
      },
      { status: 500 },
    );
  }
}
