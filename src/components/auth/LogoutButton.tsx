"use client";
import clsx from "clsx";
import { signOut } from "next-auth/react";

interface LogoutButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export function LogoutButton({
  className,
  children = "Log out",
}: LogoutButtonProps) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/landing" })}
      className={clsx(
        "w-full rounded-md border border-red-600 py-3 font-medium text-red-600 transition hover:bg-red-600 hover:text-white",
        className,
      )}
    >
      {children}
    </button>
  );
}
