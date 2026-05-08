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
Provide 8-10 specific food item suggestions based on the user's remaining targets and their goal.
Each suggestion should be a single food item or a very simple snack/meal.
Keep tone encouraging but very concise.

OUTPUT RULES:
- Return ONLY a valid JSON object.
- NO conversational text.

JSON STRUCTURE:
{
  "suggestions": [
    {
      "title": "Food Item Name",
      "description": "Short reason why this is good for your goal.",
      "calories": 250,
      "proteinG": 20,
      "carbsG": 15,
      "fatG": 10
    }
  ]
}`;

    const userPrompt = `User's Goal: ${targets.goal}
Progress for today:
- Targets: ${targets.calories} kcal, ${targets.proteinG}g protein, ${targets.carbsG}g carbs, ${targets.fatG}g fat.
- Consumed: ${consumed.calories} kcal, ${consumed.proteinG}g protein, ${consumed.carbsG}g carbs, ${consumed.fatG}g fat.
- Remaining: ${remainder.calories} kcal, ${remainder.proteinG}g protein, ${remainder.carbsG}g carbs, ${remainder.fatG}g fat.

What I've eaten:
${logs.length > 0 ? logs.map((l) => `- ${l.name}`).join("\n") : "Nothing yet."}

Return 8-10 specific food item options in the requested JSON format that align with the user's goal.`;

    const raw = await invokeCoachChat(systemPrompt, userPrompt);
    const json = extractJsonObject(raw);
    const validated = suggestionsResponseSchema.parse(json);

    return NextResponse.json(validated);
  } catch (error) {
    console.error("Suggestions error:", error);
    return NextResponse.json({ error: "Failed to get suggestions" }, { status: 500 });
  }
}
