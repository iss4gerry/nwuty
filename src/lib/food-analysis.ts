import { z, coerce } from "zod";

export const mealAnalysisSchema = z.object({
  calories: coerce.number(),
  proteinG: coerce.number(),
  carbsG: coerce.number(),
  fatG: coerce.number(),
  sugarG: coerce.number(),
  fiberG: coerce.number(),
  sodiumMg: coerce.number(),
  coachNote: z.string(),
  agentMood: z
    .enum(["neutral", "happy", "thinking", "worried", "warn", "celebrate"])
    .optional(),
});

export type MealAnalysis = z.infer<typeof mealAnalysisSchema>;

export function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1]!.trim() : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model did not return a JSON object.");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

export function parseMealAnalysis(raw: string): MealAnalysis {
  const json = extractJsonObject(raw);
  return mealAnalysisSchema.parse(json);
}
