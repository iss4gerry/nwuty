import { auth } from "@/auth";
import { getTodaySnapshot } from "@/lib/today";
import { invokeCoachChat } from "@/lib/bedrock/coach";
import { NextResponse } from "next/server";
import { extractJsonObject } from "@/lib/food-analysis";
import { suggestionsResponseSchema } from "@/lib/suggestions";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = await getTodaySnapshot(session.user.id);
    if (!today) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const { targets, consumed, remainder, logs } = today;

    const systemPrompt = `You are Mayu, a helpful and friendly nutrition coach. 
Provide 2-3 specific meal suggestions based on the user's remaining targets.
Keep tone encouraging but very concise.

OUTPUT RULES:
- Return ONLY a valid JSON object.
- NO conversational text.
- Ingredients should be specific but brief.
- DO NOT abbreviate nutrients (use "protein", "carbs", "fat", "calories").

JSON STRUCTURE:
{
  "suggestions": [
    {
      "title": "Meal Name",
      "ingredients": [
        { "name": "Ingredient", "amount": "100g", "macros": "100 calories, 10g protein" }
      ],
      "totals": "350 calories, 25g protein, 10g fat"
    }
  ]
}`;

    const userPrompt = `Progress for today:
- Targets: ${targets.calories} kcal, ${targets.proteinG}g protein, ${targets.carbsG}g carbs, ${targets.fatG}g fat.
- Consumed: ${consumed.calories} kcal, ${consumed.proteinG}g protein, ${consumed.carbsG}g carbs, ${consumed.fatG}g fat.
- Remaining: ${remainder.calories} kcal, ${remainder.proteinG}g protein, ${remainder.carbsG}g carbs, ${remainder.fatG}g fat.

What I've eaten:
${logs.length > 0 ? logs.map((l) => `- ${l.name}`).join("\n") : "Nothing yet."}

Return 2-3 specific meal options in the requested JSON format.`;

    const raw = await invokeCoachChat(systemPrompt, userPrompt);
    const json = extractJsonObject(raw);
    const validated = suggestionsResponseSchema.parse(json);

    return NextResponse.json(validated);
  } catch (error) {
    console.error("Suggestions error:", error);
    return NextResponse.json({ error: "Failed to get suggestions" }, { status: 500 });
  }
}
