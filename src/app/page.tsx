import { auth } from "@/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-full flex-col px-6 py-24 sm:py-28">
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.22em] text-[var(--app-muted)]">
          nwuty
        </p>
        <h1 className="mt-5 font-serif text-[2.35rem] font-medium leading-[1.12] tracking-tight sm:text-5xl">
          <span className="text-gradient-accent">
            Log meals, stay on track with Mayu.
          </span>
        </h1>
        <p className="mt-7 max-w-md text-balance text-sm leading-[1.7] text-[var(--app-muted)]">
          Targets from your profile. Add entries by photo or text. Each day
          resets at midnight (WIB, Indonesia).
        </p>
        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login"
            className="btn-primary inline-flex min-w-[8.5rem] justify-center"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="btn-secondary inline-flex min-w-[8.5rem] justify-center"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
