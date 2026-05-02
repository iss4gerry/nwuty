import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { ProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
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

  return (
    <ProfileForm
      email={user.email}
      name={user.name}
      profile={{
        heightCm: user.profile.heightCm,
        weightKg: user.profile.weightKg,
        gender: user.profile.gender,
        activityLevel: user.profile.activityLevel,
      }}
    />
  );
}
