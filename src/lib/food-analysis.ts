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
  let cleaned = raw.trim();
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    cleaned = fence[1]!.trim();
  }

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model did not return a JSON object.");
  }

  const jsonCandidate = cleaned.slice(start, end + 1);
  
  // Basic cleanup for common AI JSON mistakes:
  // 1. Remove trailing commas before closing braces/brackets
  const sanitized = jsonCandidate
    .replace(/,\s*([}\]])/g, "$1")
    // 2. Sometimes AI adds comments like // or #
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/^\s*#.*$/gm, "");

  try {
    return JSON.parse(sanitized);
  } catch (e) {
    console.error("JSON Parse Error. Cleaned string was:", sanitized);
    throw e;
  }
}

export function parseMealAnalysis(raw: string): MealAnalysis {
  const json = extractJsonObject(raw);
  return mealAnalysisSchema.parse(json);
}
