import { z } from "zod";

export const suggestionIngredientSchema = z.object({
  name: z.string(),
  amount: z.string(),
  macros: z.string(),
});

export const suggestionCardSchema = z.object({
  title: z.string(),
  ingredients: z.array(suggestionIngredientSchema),
  totals: z.string(),
});

export const suggestionsResponseSchema = z.object({
  suggestions: z.array(suggestionCardSchema),
});

export type SuggestionCard = z.infer<typeof suggestionCardSchema>;
export type SuggestionsResponse = z.infer<typeof suggestionsResponseSchema>;
