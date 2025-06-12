"use client";

import { Sparkles } from "lucide-react";
import { Button } from "./Button";

interface InsightsToggleProps {
  onClick: () => void;
}

export function InsightsToggle({ onClick }: InsightsToggleProps) {
  return (
    <Button variant="ghost" size="icon" onClick={onClick} title="Show insights">
      <Sparkles size={18} />
    </Button>
  );
}
