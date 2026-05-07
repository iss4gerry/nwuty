import {
  bedrockChatCompletions,
  extractAssistantText,
} from "@/lib/bedrock/http";

const MODEL_ID =
  process.env.BEDROCK_COACH_MODEL_ID ?? "openai.gpt-oss-120b";

function errText(e: unknown) {
  if (e instanceof Error) return e.message;
  return String(e);
}

function shouldRetryCoachWithSystemRole(e: unknown): boolean {
  const t = errText(e).toLowerCase();
  return /invalid.*(message|role)|unknown.*role|unsupported.*role|not allowed.*role|role\s+['"]?developer['"]?/.test(
    t,
  );
}

async function coachChatOnce(
  system: string,
  user: string,
  systemAs: "developer" | "system",
): Promise<string> {
  const body = {
    model: MODEL_ID,
    messages: [
      { role: systemAs, content: system },
      { role: "user" as const, content: user },
    ],
    max_tokens: 4000,
    temperature: 0.25,
  };
  
  const json = await bedrockChatCompletions(body);
  const text = extractAssistantText(json).trim();
  if (!text) {
    throw new Error("Model returned empty text.");
  }
  return text;
}

export async function invokeCoachChat(
  system: string,
  user: string,
): Promise<string> {
  try {
    return await coachChatOnce(system, user, "developer");
  } catch (e) {
    if (!shouldRetryCoachWithSystemRole(e)) {
      throw e;
    }
    return await coachChatOnce(system, user, "system");
  }
}
