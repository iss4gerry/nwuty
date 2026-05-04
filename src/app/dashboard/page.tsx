import { auth } from "@/auth";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getTodaySnapshot, todayDataClientKey } from "@/lib/today";
import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard · nwuty",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { profile: true },
  });
  if (!user?.profile) {
    redirect("/onboarding");
  }

  const initial = await getTodaySnapshot(session.user.id);
  if (!initial) {
    redirect("/onboarding");
  }

  return (
    <DashboardClient key={todayDataClientKey(initial)} initial={initial} />
  );
}
