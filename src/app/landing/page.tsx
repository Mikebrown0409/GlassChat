import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";

export default async function LandingPage() {
  const session = await auth();
  if (session) {
    redirect("/");
  }

  return (
    <main className="bg-gradient-brand flex min-h-screen flex-col items-center justify-center px-4 text-center text-white">
      <h1 className="text-5xl font-extrabold tracking-tight drop-shadow-lg md:text-6xl lg:text-7xl">
        Welcome to{" "}
        <span className="rounded-md bg-white/20 px-3 py-1">GlassChat</span>
      </h1>
      <p className="mt-6 max-w-2xl text-lg opacity-90 md:text-xl">
        An AI chat experience with a beautiful glassmorphism interface.
        Collaborate, learn, and explore ideas together.
      </p>
      <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
        <Link
          href="/login"
          className="text-brand-primary rounded-md bg-white px-8 py-3 font-semibold shadow-lg transition hover:brightness-95"
        >
          Get Started
        </Link>
        <a
          href="https://github.com/your-org/glasschat"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-white/40 px-8 py-3 font-semibold text-white/90 transition hover:bg-white/10"
        >
          View on GitHub
        </a>
      </div>
    </main>
  );
}
