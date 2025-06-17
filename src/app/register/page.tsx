"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // For now just call credentials signIn (not yet implemented)
    await signIn("credentials", {
      email,
      password,
      callbackUrl: "/",
    });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-24">
      <form
        onSubmit={handleSubmit}
        className="backdrop-blur-md/60 w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-8 shadow-xl"
      >
        <h1 className="text-center text-2xl font-semibold text-white">
          Create your account
        </h1>
        <label className="mt-6 block text-sm text-white/80">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md bg-white/90 px-3 py-2 text-sm text-zinc-900 focus:outline-none"
        />
        <label className="mt-4 block text-sm text-white/80">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-md bg-white/90 px-3 py-2 text-sm text-zinc-900 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-md bg-emerald-400 px-4 py-2 font-semibold text-zinc-900 transition hover:bg-emerald-300"
        >
          {loading ? "Creating…" : "Register"}
        </button>
        <p className="mt-6 text-center text-sm text-white/70">
          Already have an account?{" "}
          <Link href="/login" className="underline">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
