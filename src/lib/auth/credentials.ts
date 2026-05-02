import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export async function authorizeCredentials(
  credentials: Partial<Record<"email" | "password", unknown>>,
) {
  const email = credentials?.email;
  const password = credentials?.password;
  if (!email || !password) return null;

  const user = await prisma.user.findUnique({
    where: { email: String(email).toLowerCase().trim() },
  });
  if (!user) return null;

  const valid = await bcrypt.compare(String(password), user.passwordHash);
  if (!valid) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name ?? undefined,
  };
}
