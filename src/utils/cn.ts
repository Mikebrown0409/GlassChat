import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines Tailwind CSS classes conditionally while deduplicating conflicting utilities.
 * Wraps clsx for conditional logic and passes result through tailwind-merge for smarter merges.
 */
export function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}
