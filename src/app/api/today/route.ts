import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTodaySnapshot } from "@/lib/today";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const snap = await getTodaySnapshot(session.user.id);
  if (!snap) {
    return NextResponse.json({ error: "Complete your profile first." }, { status: 400 });
  }
  return NextResponse.json(snap);
}
