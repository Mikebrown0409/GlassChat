"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { OAuthButton } from "~/components/auth/OAuthButton";

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [status, router]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  if (status === "authenticated") {
    return null; // or a spinner
  }

  const handleTestUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    setLoading(true);
    try {
      await signIn("test-user", {
        name,
        email,
        callbackUrl: "/",
      });
    } catch (error) {
      console.error("Test user login failed:", error);
    } finally {
      setLoading(false);
    }
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

        {/* Development Test User Form */}
        {process.env.NODE_ENV === "development" && (
          <>
            <div className="my-6 h-px w-full bg-white/10" />

            <form onSubmit={handleTestUserSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-white/80">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Test User"
                  className="mt-1 w-full rounded-md bg-white/90 px-3 py-2 text-sm text-zinc-900 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-white/80">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="test@example.com"
                  className="mt-1 w-full rounded-md bg-white/90 px-3 py-2 text-sm text-zinc-900 focus:outline-none"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading || !name || !email}
                className="w-full cursor-pointer rounded-md bg-emerald-400 px-4 py-2 font-semibold text-zinc-900 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Creating Test User..." : "Create Test User"}
              </button>
            </form>
          </>
        )}

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
