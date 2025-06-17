"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { OAuthButton } from "~/components/auth/OAuthButton";

export default function LoginPage() {
  const { data: session } = useSession();
  const router = useRouter();
  if (session) {
    router.replace("/");
  }

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await signIn("credentials", {
      email,
      password,
      callbackUrl: "/",
    });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-24">
      <div className="backdrop-blur-md/60 w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-8 shadow-xl">
        <h1 className="text-center text-2xl font-semibold text-white">
          Sign in to GlassChat
        </h1>

        {/* OAuth Buttons */}
        <div className="mt-6 flex flex-col gap-3">
          <OAuthButton provider="google">Continue with Google</OAuthButton>
          <OAuthButton provider="discord" variant="secondary">
            Continue with Discord
          </OAuthButton>
        </div>

        <div className="my-6 h-px w-full bg-white/10" />

        {/* Email/password form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-white/80">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md bg-white/90 px-3 py-2 text-sm text-zinc-900 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-white/80">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md bg-white/90 px-3 py-2 text-sm text-zinc-900 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full cursor-pointer rounded-md bg-emerald-400 px-4 py-2 font-semibold text-zinc-900 transition hover:bg-emerald-300 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/70">
          Don&apos;t have an account?{" "}
          <a href="/register" className="underline">
            Register
          </a>
        </p>
      </div>
    </main>
  );
}
