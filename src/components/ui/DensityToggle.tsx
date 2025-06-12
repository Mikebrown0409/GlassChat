"use client";

import { AlignJustify } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./Button";

export type Density = "cozy" | "compact";

export function DensityToggle() {
  const [density, setDensity] = useState<Density>(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(
        "ui-density",
      ) as Density | null;
      if (stored === "compact" || stored === "cozy") return stored;
    }
    return "cozy";
  });

  useEffect(() => {
    // Apply attribute to <html>
    document.documentElement.setAttribute("data-density", density);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("ui-density", density);
    }
  }, [density]);

  const toggle = () => setDensity((d) => (d === "cozy" ? "compact" : "cozy"));

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      title={
        density === "cozy"
          ? "Switch to compact density"
          : "Switch to cozy density"
      }
    >
      <AlignJustify size={18} />
    </Button>
  );
}
