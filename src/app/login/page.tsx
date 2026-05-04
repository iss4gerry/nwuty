"use client";

import { FormShell } from "@/components/FormShell";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        setErr("Email or password is incorrect.");
        return;
      }
      router.replace("/dashboard");
      queueMicrotask(() => router.refresh());
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormShell
      title="Log in to nwuty"
      subtitle="Use the email and password you signed up with."
    >
      <form onSubmit={submit} className="space-y-4">
        {err ? (
          <p
            role="alert"
            className="rounded-lg border border-[rgba(176,90,110,0.35)] bg-[rgba(255,255,255,0.95)] px-3 py-2 text-sm text-[#6b2f3d]"
          >
            {err}
          </p>
        ) : null}
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="Email"
          className="input-field"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          required
          autoComplete="current-password"
          placeholder="Password"
          className="input-field"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" disabled={busy} className="btn-primary w-full">
          Continue
        </button>
      </form>
      <p className="mt-8 text-center text-sm text-[var(--app-muted)]">
        New here?{" "}
        <Link
          href="/register"
          className="font-medium text-[var(--app-accent)] underline decoration-[rgba(116,69,119,0.25)] underline-offset-4 hover:decoration-[var(--app-accent)]"
        >
          Sign up
        </Link>
      </p>
    </FormShell>
  );
}
