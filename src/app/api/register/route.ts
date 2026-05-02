import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { APP_TIMEZONE } from "@/lib/app-constants";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(80).optional(),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const email = body.email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "This email is already registered." },
        { status: 409 },
      );
    }
    const passwordHash = await bcrypt.hash(body.password, 12);
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: body.name,
        timezone: APP_TIMEZONE,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data.", issues: e.flatten() },
        { status: 400 },
      );
    }
    console.error(e);
    return NextResponse.json({ error: "Registration failed." }, { status: 500 });
  }
}
