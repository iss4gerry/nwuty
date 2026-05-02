import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { ActivityLevel, Gender } from "@/generated/prisma/enums";
import { APP_TIMEZONE, DEFAULT_BIRTH_DATE_ISO } from "@/lib/app-constants";

const genderSchema = z.enum([Gender.MALE, Gender.FEMALE]);

const activitySchema = z.enum([
  ActivityLevel.SEDENTARY,
  ActivityLevel.LIGHT,
  ActivityLevel.MODERATE,
  ActivityLevel.ACTIVE,
  ActivityLevel.VERY_ACTIVE,
]);

const schema = z.object({
  heightCm: z.number().min(50).max(260),
  weightKg: z.number().min(20).max(400),
  gender: genderSchema,
  birthDate: z.string().optional(),
  activityLevel: activitySchema,
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = schema.parse(await req.json());
    const birthDate = new Date(body.birthDate ?? DEFAULT_BIRTH_DATE_ISO);
    if (Number.isNaN(birthDate.getTime())) {
      return NextResponse.json({ error: "Invalid date of birth." }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { timezone: APP_TIMEZONE },
    });

    await prisma.profile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        heightCm: body.heightCm,
        weightKg: body.weightKg,
        gender: body.gender,
        birthDate,
        activityLevel: body.activityLevel,
      },
      update: {
        heightCm: body.heightCm,
        weightKg: body.weightKg,
        gender: body.gender,
        birthDate,
        activityLevel: body.activityLevel,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request.", issues: e.flatten() },
        { status: 400 },
      );
    }
    console.error(e);
    return NextResponse.json({ error: "Could not save profile." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const patch = z
      .object({
        name: z.string().min(1).max(80).nullable().optional(),
        heightCm: z.number().min(50).max(260).optional(),
        weightKg: z.number().min(20).max(400).optional(),
        gender: genderSchema.optional(),
        birthDate: z.string().optional(),
        activityLevel: activitySchema.optional(),
      })
      .parse(await req.json());

    const userData: { name?: string | null; timezone: string } = {
      timezone: APP_TIMEZONE,
    };
    if (patch.name !== undefined) userData.name = patch.name;

    await prisma.user.update({
      where: { id: session.user.id },
      data: userData,
    });

    const profileUpdate: Record<string, unknown> = {};
    if (patch.heightCm !== undefined) profileUpdate.heightCm = patch.heightCm;
    if (patch.weightKg !== undefined) profileUpdate.weightKg = patch.weightKg;
    if (patch.gender) profileUpdate.gender = patch.gender;
    if (patch.birthDate) {
      const d = new Date(patch.birthDate);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: "Invalid date of birth." }, { status: 400 });
      }
      profileUpdate.birthDate = d;
    }
    if (patch.activityLevel) profileUpdate.activityLevel = patch.activityLevel;

    if (Object.keys(profileUpdate).length) {
      try {
        await prisma.profile.update({
          where: { userId: session.user.id },
          data: profileUpdate,
        });
      } catch {
        return NextResponse.json({ error: "Profile not found." }, { status: 404 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request.", issues: e.flatten() },
        { status: 400 },
      );
    }
    console.error(e);
    return NextResponse.json({ error: "Could not update." }, { status: 500 });
  }
}
