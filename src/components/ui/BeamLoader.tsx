import React from "react";

interface BeamLoaderProps {
  size?: number;
  className?: string;
}

// A sleek rotating gradient ring used as a thinking indicator
export function BeamLoader({ size = 20, className = "" }: BeamLoaderProps) {
  const strokeWidth = 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`animate-spin ${className}`}
    >
      <defs>
        <linearGradient id="beamGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(var(--accent-primary))" />
          <stop offset="100%" stopColor="hsl(var(--accent-secondary))" />
        </linearGradient>
      </defs>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="url(#beamGradient)"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={circumference * 0.25}
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export default BeamLoader;
