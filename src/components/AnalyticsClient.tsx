"use client";

import dynamic from "next/dynamic";

// Dynamically import the analytics client-side only so none of its
// code runs during server-side rendering (avoids global `location` reference).
const VercelAnalytics = dynamic(
  () => import("@vercel/analytics/react").then((m) => m.Analytics),
  { ssr: false },
);

export default function Analytics() {
  return <VercelAnalytics />;
}
