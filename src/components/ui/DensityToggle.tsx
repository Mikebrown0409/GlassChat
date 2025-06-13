"use client";

import { AlignJustify } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./Button";

export type Density = "cozy" | "compact";

export function DensityToggle() {
  const [density, setDensity] = useState<Density | null>(null);

  // Hydrate from localStorage only on client to avoid SSR mismatch
  useEffect(() => {
    const stored = window.localStorage.getItem("ui-density") as Density | null;
    const initial = stored === "compact" || stored === "cozy" ? stored : "cozy";
    setDensity(initial);
  }, []);

  useEffect(() => {
    if (!density) return;
    document.documentElement.setAttribute("data-density", density);
    window.localStorage.setItem("ui-density", density);
  }, [density]);

  const toggle = () => setDensity((d) => (d === "cozy" ? "compact" : "cozy"));

  if (!density) return null; // avoid hydration mismatch

  return (
    <Button variant="ghost" size="icon" onClick={toggle} title="Toggle density">
      <AlignJustify size={18} />
    </Button>
  );
}
