import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getLocalDateString } from "@/lib/dates";
import {
  expressionFromRemainder,
  remainingFromTargets,
  sumConsumed,
} from "@/lib/nutrition";
import { getTodaySnapshot } from "@/lib/today";

const schema = z.object({
  name: z.string().min(1).max(200),
  calories: z.number(),
  proteinG: z.number(),
  carbsG: z.number(),
  fatG: z.number(),
  sugarG: z.number(),
  fiberG: z.number(),
  sodiumMg: z.number(),
  coachNote: z.string().max(2000).optional(),
  agentMood: z.string().max(32).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snap = await getTodaySnapshot(session.user.id);
  if (!snap) {
    return NextResponse.json({ error: "Complete your profile first." }, { status: 400 });
  }

  try {
    const body = schema.parse(await req.json());

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { timezone: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    const localDate = getLocalDateString(user.timezone);

    const expression = (() => {
      const after = sumConsumed([
        snap.consumed,
        {
          calories: body.calories,
          proteinG: body.proteinG,
          carbsG: body.carbsG,
          fatG: body.fatG,
          sugarG: body.sugarG,
          fiberG: body.fiberG,
          sodiumMg: body.sodiumMg,
        },
      ]);
      const rem = remainingFromTargets(snap.targets, after);
      return expressionFromRemainder(snap.targets, rem);
    })();

    await prisma.foodLog.create({
      data: {
        userId: session.user.id,
        localDate,
        name: body.name,
        calories: body.calories,
        proteinG: body.proteinG,
        carbsG: body.carbsG,
        fatG: body.fatG,
        sugarG: body.sugarG,
        fiberG: body.fiberG,
        sodiumMg: body.sodiumMg,
        coachNote: body.coachNote ?? null,
        agentMood: body.agentMood ?? expression,
      },
    });

    const nextSnap = await getTodaySnapshot(session.user.id);
    return NextResponse.json({ ok: true, today: nextSnap });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request.", issues: e.flatten() },
        { status: 400 },
      );
    }
    console.error(e);
    return NextResponse.json({ error: "Could not save log entry." }, { status: 500 });
  }
}
