"use client";

import { FormShell } from "@/components/FormShell";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name: name || undefined,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setErr(j.error ?? "Registration failed.");
        return;
      }
      const inRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (inRes?.error) {
        router.replace("/login");
        return;
      }
      router.replace("/onboarding");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormShell
      title="Create a nwuty account"
      subtitle="Password must be at least 8 characters."
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
          type="text"
          placeholder="Display name (optional)"
          className="input-field"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
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
          autoComplete="new-password"
          placeholder="Password"
          className="input-field"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" disabled={busy} className="btn-primary w-full">
          Create account
        </button>
      </form>
      <p className="mt-8 text-center text-sm text-[var(--app-muted)]">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-[var(--app-accent)] underline decoration-[rgba(116,69,119,0.25)] underline-offset-4 hover:decoration-[var(--app-accent)]"
        >
          Log in
        </Link>
      </p>
    </FormShell>
  );
}
