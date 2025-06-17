"use client";
import clsx from "clsx";
import { signIn } from "next-auth/react";

interface OAuthButtonProps {
  provider: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
}

export function OAuthButton({
  provider,
  children,
  variant = "primary",
  className,
}: OAuthButtonProps) {
  const base =
    variant === "primary"
      ? "bg-brand-primary text-white hover:bg-brand-primary/90"
      : "border border-border-subtle bg-surface-0 text-text-primary hover:bg-surface-1";

  return (
    <button
      type="button"
      onClick={() => signIn(provider, { callbackUrl: "/" })}
      className={clsx(
        "w-full cursor-pointer rounded-md py-3 font-medium transition",
        base,
        className,
      )}
    >
      {children}
    </button>
  );
}
