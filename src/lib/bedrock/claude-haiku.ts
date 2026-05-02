import {
  bedrockChatCompletions,
  extractAssistantText,
} from "@/lib/bedrock/http";

const MODEL_ID =
  process.env.BEDROCK_CLAUDE_MODEL_ID ?? "qwen.qwen3-vl-235b-a22b-instruct";

export async function identifyFoodFromImageBase64(
  base64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif",
): Promise<string> {
  const dataUrl = `data:${mediaType};base64,${base64}`;

  const body = {
    model: MODEL_ID,
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: dataUrl },
          },
          {
            type: "text",
            text: "What food is in this image? Reply with ONLY the food name(s). If there are multiple distinct foods, separate with commas. No extra explanation.",
          },
        ],
      },
    ],
  };

  const json = await bedrockChatCompletions(body);
  return extractAssistantText(json);
}
