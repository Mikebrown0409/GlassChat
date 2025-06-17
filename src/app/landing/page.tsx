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
          {/* animated gradient-border sign in */}
          <Link
            href="/login"
            className="relative inline-block rounded-full p-[2px]"
          >
            <span className="animate-gradient-x absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-violet-600 bg-[length:200%_200%]" />
            <span className="relative block rounded-full bg-zinc-900/80 px-8 py-3 text-sm font-semibold text-white backdrop-blur-md">
              Sign&nbsp;In
            </span>
          </Link>

          <Link
            href="/register"
            className="rounded-full border border-white/40 px-8 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/10"
          >
            Register
          </Link>
          <a
            href="https://github.com/Mikebrown0409/GlassChat"
            target="_blank"
            className="rounded-full px-8 py-3 text-sm font-semibold text-white/70 underline-offset-4 transition hover:text-white"
            rel="noopener noreferrer"
          >
            GitHub ↗
          </a>
        </div>

        {/* subtle binary scrolling layer */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
          <pre
            style={{
              animation: "scroll 15s linear infinite",
            }}
            className="text-[10px] leading-3 whitespace-pre text-fuchsia-500/20 select-none"
          >
            {"0101010011001010 0011010101110001 1100101001010101 0110010100101010 00110101\n".repeat(
              60,
            )}
          </pre>
        </div>
        {/* feature tiles */}
        <div className="mt-16 grid w-full max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            { title: "GPT-4o", desc: "Latest OpenAI model" },
            { title: "Realtime", desc: "Upstash Redis sync" },
            { title: "Memory", desc: "Context that grows" },
          ].map(({ title, desc }) => (
            <div
              key={title}
              className="backdrop-blur-md/50 rounded-2xl border border-white/10 bg-white/5 p-6 text-left shadow-lg transition hover:border-fuchsia-400/60 hover:shadow-fuchsia-500/20"
            >
              <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
              <p className="text-sm text-white/70">{desc}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Animated gradient blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-100px] left-1/4 h-[500px] w-[500px] -translate-x-1/2 [animation:spin_40s_linear_infinite] rounded-full bg-gradient-to-tr from-fuchsia-500 via-purple-600 to-indigo-700 opacity-30 blur-3xl" />
        <div className="absolute right-0 bottom-[-120px] h-[400px] w-[400px] [animation:spin_60s_linear_reverse_infinite] rounded-full bg-gradient-to-br from-emerald-400 via-sky-500 to-purple-600 opacity-20 blur-2xl" />
      </div>

      {/* keyframes style injected */}
      <style jsx global>{`
        @keyframes gradient-x {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        @keyframes scroll {
          0% {
            transform: translateY(0%);
          }
          100% {
            transform: translateY(-100%);
          }
        }
      `}</style>
    </main>
  );
}
