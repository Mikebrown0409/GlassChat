"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import heroArt from "../../../public/landing-bg.webp";

export default function LandingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  if (session) {
    router.replace("/");
  }

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const [parallax, setParallax] = useState(false);

  const getCenter = (axis: "x" | "y") => {
    if (typeof window === "undefined") return 0;
    return axis === "x" ? window.innerWidth / 2 : window.innerHeight / 2;
  };

  const blob1X = useTransform(
    mouseX,
    (v) => `${(v - getCenter("x")) * -0.02}px`,
  );
  const blob1Y = useTransform(
    mouseY,
    (v) => `${(v - getCenter("y")) * -0.02}px`,
  );
  const blob2X = useTransform(
    mouseX,
    (v) => `${(v - getCenter("x")) * 0.015}px`,
  );
  const blob2Y = useTransform(
    mouseY,
    (v) => `${(v - getCenter("y")) * 0.015}px`,
  );

  return (
    <main
      onMouseMove={(e) => {
        if (!parallax) setParallax(true);
        mouseX.set(e.clientX);
        mouseY.set(e.clientY);
      }}
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-zinc-950 px-4 py-24 text-center text-white"
    >
      {/* Glass hero card */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="backdrop-blur-lg/60 glass relative mx-auto flex max-w-3xl flex-col items-center rounded-3xl border border-violet-600/40 bg-zinc-900/40 px-8 py-16 shadow-[0_0_40px_0_rgba(124,58,237,0.45)]"
        style={{ WebkitBackdropFilter: "blur(16px)" }}
      >
        {/* background art */}
        <Image
          src={heroArt}
          alt="classical statue facing robot illustration"
          fill
          priority
          unoptimized
          sizes="100vw"
          className="pointer-events-none object-contain opacity-15 mix-blend-screen select-none md:opacity-20"
        />

        <h1 className="relative z-10 bg-gradient-to-r from-white to-zinc-200 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent md:text-6xl">
          GlassChat
        </h1>
        <p className="relative z-10 mt-4 max-w-xl text-lg leading-relaxed text-white/90">
          AI chat & real-time collaboration—polished with glassmorphism.
          Brainstorm, code, and create together.
        </p>

        <div className="relative z-10 mt-10 flex flex-col items-center gap-4 sm:flex-row">
          {/* animated gradient-border sign in */}
          <Link
            href="/login"
            className="relative inline-block rounded-full p-[2px]"
          >
            <span className="animate-gradient-x absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-violet-700 bg-[length:200%_200%]" />
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

        {/* animated noise overlay */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
          <div className="animate-pulse-slow absolute inset-0 scale-110 rounded-3xl bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nNzAnIGhlaWdodD0nNzAnIHhtbG5zPSdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Zyc+PHJlY3Qgd2lkdGg9JzcwJyBoZWlnaHQ9JzcwJyBmaWxsPScjZmZmJyAvPjxmaWx0ZXIgaWQ9J24nPjxmZUdhdXNzaWFuQmx1ciBzdGREZXZpYXRpb249JzMuMCcgLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWx0ZXI9InVybCgjbikiIG9wYWNpdHk9JzAuMDUnIC8+PC9zdmc+')'] opacity-20" />
        </div>
        {/* feature tiles */}
        <div className="mt-16 grid w-full max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            {
              title: "Multiple AI Models",
              desc: "Chat with GPT-4o, Claude & more—switch instantly.",
            },
            {
              title: "Realtime Collab",
              desc: "See every participant's cursor & messages live.",
            },
            {
              title: "Persistent Memory",
              desc: "GlassChat remembers your project context & summaries.",
            },
          ].map(({ title, desc }) => (
            <div
              key={title}
              className="backdrop-blur-md/50 rounded-2xl border border-white/10 bg-white/5 p-6 text-left shadow-lg transition hover:border-violet-500/60 hover:shadow-violet-500/20"
            >
              <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
              <p className="text-sm text-white/70">{desc}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* animated gradient blobs */}
      <motion.div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          style={parallax ? { x: blob1X, y: blob1Y } : undefined}
          className="absolute top-[-100px] left-1/4 h-[500px] w-[500px] -translate-x-1/2 [animation:spin_40s_linear_infinite] rounded-full bg-gradient-to-tr from-violet-600 via-indigo-700 to-purple-800 opacity-25 blur-3xl"
        />
        <motion.div
          style={parallax ? { x: blob2X, y: blob2Y } : undefined}
          className="absolute right-0 bottom-[-120px] h-[400px] w-[400px] [animation:spin_60s_linear_reverse_infinite] rounded-full bg-gradient-to-br from-cyan-500 via-indigo-600 to-violet-700 opacity-20 blur-2xl"
        />
      </motion.div>

      {/* tech stack badges */}
      <div className="mt-20 flex flex-wrap items-center justify-center gap-4 opacity-70">
        {["AI Models", "Live Collaboration", "Smart Memory"].map((l) => (
          <span
            key={l}
            className="rounded-full border border-white/20 px-3 py-1 text-xs tracking-wide text-zinc-400 backdrop-blur-sm"
          >
            {l}
          </span>
        ))}
      </div>

      {/* spacer */}
      <div className="h-24" />

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
        .animate-pulse-slow {
          animation: pulseNoise 8s ease-in-out infinite;
        }
        @keyframes pulseNoise {
          0% {
            opacity: 0.15;
            transform: scale(1);
          }
          50% {
            opacity: 0.25;
            transform: scale(1.02);
          }
          100% {
            opacity: 0.15;
            transform: scale(1);
          }
        }
      `}</style>
    </main>
  );
}
