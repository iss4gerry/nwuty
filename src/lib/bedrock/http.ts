import OpenAI from "openai";

function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, "");
}

export function getBedrockHttpConfig() {
  const baseUrl = (
    process.env.BEDROCK_BASE_URL?.trim() ||
    process.env.OPENAI_BASE_URL?.trim()
  );
  const apiKey = (
    process.env.BEDROCK_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim()
  );

  if (!baseUrl) {
    throw new Error(
      "Set BEDROCK_BASE_URL or OPENAI_BASE_URL (Mantle URL, ending in /v1).",
    );
  }
  if (!apiKey) {
    throw new Error(
      "Set BEDROCK_API_KEY or OPENAI_API_KEY (Bedrock API key). Without it, Authorization is not sent and the API may return 401.",
    );
  }

  return { baseUrl: normalizeBaseUrl(baseUrl), apiKey };
}

const chatPath =
  process.env.BEDROCK_CHAT_COMPLETIONS_PATH?.trim() ?? "/chat/completions";

function authHeadersForMode(apiKey: string): Record<string, string> {
  const mode = (process.env.BEDROCK_AUTH_MODE ?? "bearer").toLowerCase();
  if (mode === "raw") {
    return { Authorization: apiKey };
  }
  if (mode === "x-api-key") {
    return { "x-api-key": apiKey };
  }
  return { Authorization: `Bearer ${apiKey}` };
}

let bearerClient: OpenAI | null = null;

function getBearerMantleClient(): OpenAI {
  if (bearerClient) return bearerClient;
  const { baseUrl, apiKey } = getBedrockHttpConfig();
  bearerClient = new OpenAI({
    baseURL: baseUrl,
    apiKey,
  });
  return bearerClient;
}

export async function bedrockChatCompletions(
  body: Record<string, unknown>,
): Promise<unknown> {
  const mode = (process.env.BEDROCK_AUTH_MODE ?? "bearer").toLowerCase();

  if (mode === "bearer") {
    const client = getBearerMantleClient();
    return client.chat.completions.create(
      body as unknown as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming,
    ) as unknown;
  }

  const { baseUrl, apiKey } = getBedrockHttpConfig();
  const path = chatPath.startsWith("/") ? chatPath : `/${chatPath}`;
  const url = `${baseUrl}${path}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeadersForMode(apiKey),
    },
    body: JSON.stringify(body),
  });

  const rawText = await res.text();
  if (!res.ok) {
    throw new Error(`Bedrock HTTP ${res.status}: ${rawText.slice(0, 800)}`);
  }

  try {
    return JSON.parse(rawText) as unknown;
  } catch {
    throw new Error("Bedrock response was not valid JSON.");
  }
}

export function extractAssistantText(data: unknown): string {
  const d = data as Record<string, unknown>;
  const choices = d.choices as Array<Record<string, unknown>> | undefined;
  const msg = choices?.[0]?.message as Record<string, unknown> | undefined;
  const content = msg?.content;

  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    const parts = content
      .map((part) => {
        if (!part || typeof part !== "object") return "";
        const p = part as Record<string, unknown>;
        if (typeof p.text === "string") return p.text;
        return "";
      })
      .join("");
    return parts.trim();
  }

  return "";
}
