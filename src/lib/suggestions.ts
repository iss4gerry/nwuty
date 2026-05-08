import { z } from "zod";

export const suggestionCardSchema = z.object({
  title: z.string(),
  description: z.string(),
  calories: z.number(),
  proteinG: z.number(),
  carbsG: z.number(),
  fatG: z.number(),
});

export const suggestionsResponseSchema = z.object({
  suggestions: z.array(suggestionCardSchema),
});

export type SuggestionCard = z.infer<typeof suggestionCardSchema>;
export type SuggestionsResponse = z.infer<typeof suggestionsResponseSchema>;
