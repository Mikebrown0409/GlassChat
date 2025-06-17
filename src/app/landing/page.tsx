"use client";

import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  if (session) {
    router.replace("/");
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-zinc-950 px-4 py-24 text-center text-white">
      {/* Glass hero card */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="backdrop-blur-lg/60 glass relative mx-auto flex max-w-3xl flex-col items-center rounded-3xl border border-fuchsia-500/30 bg-zinc-900/40 px-8 py-16 shadow-[0_0_40px_0_rgba(217,70,239,0.4)]"
        style={{ WebkitBackdropFilter: "blur(16px)" }}
      >
        <h1 className="bg-gradient-to-r from-white to-zinc-200 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent md:text-6xl">
          GlassChat
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-white/90">
          AI chat & real-time collaboration—polished with glassmorphism.
          Brainstorm, code, and create together.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/login"
            className="rounded-full bg-fuchsia-500 px-8 py-3 font-semibold text-white shadow-md transition hover:bg-fuchsia-400"
          >
            Sign&nbsp;In
          </Link>
          <Link
            href="/register"
            className="rounded-full border border-white/50 px-8 py-3 font-semibold text-white/90 transition hover:bg-white/10"
          >
            Register
          </Link>
          <a
            href="https://github.com/Mikebrown0409/GlassChat"
            target="_blank"
            className="rounded-full border border-white/0 px-8 py-3 font-semibold text-white/70 underline-offset-4 transition hover:text-white"
            rel="noopener noreferrer"
          >
            GitHub ↗
          </a>
        </div>
      </motion.section>

      {/* Animated gradient blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-100px] left-1/4 h-[500px] w-[500px] -translate-x-1/2 [animation:spin_40s_linear_infinite] rounded-full bg-gradient-to-tr from-fuchsia-500 via-purple-600 to-indigo-700 opacity-30 blur-3xl" />
        <div className="absolute right-0 bottom-[-120px] h-[400px] w-[400px] [animation:spin_60s_linear_reverse_infinite] rounded-full bg-gradient-to-br from-emerald-400 via-sky-500 to-purple-600 opacity-20 blur-2xl" />
      </div>
    </main>
  );
}
