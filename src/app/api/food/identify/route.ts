import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { identifyFoodFromImageBase64 } from "@/lib/bedrock/claude-haiku";

const schema = z.object({
  imageBase64: z.string().min(20).max(9_000_000),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = schema.parse(await req.json());
    let b64 = body.imageBase64;
    if (b64.startsWith("data:")) {
      const idx = b64.indexOf(",");
      b64 = idx >= 0 ? b64.slice(idx + 1) : b64;
    }
    const foodName = await identifyFoodFromImageBase64(b64, body.mimeType);
    if (!foodName) {
      return NextResponse.json(
        { error: "Could not recognize the food in this image." },
        { status: 422 },
      );
    }
    return NextResponse.json({ foodName });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request.", issues: e.flatten() },
        { status: 400 },
      );
    }
    console.error(e);
    return NextResponse.json(
      { error: "Could not analyze the image." },
      { status: 500 },
    );
  }
}
