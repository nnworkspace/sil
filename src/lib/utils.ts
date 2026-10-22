import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Shared styling for native file inputs (#40): make the "Choose file" selector
 * button read as a proper sharp-edged button, and mute the "no file chosen"
 * text. Compose with layout classes via `cn(fileInputClass, "…")`.
 */
export const fileInputClass =
  "block w-full text-sm text-muted-foreground file:mr-3 file:cursor-pointer file:border-0 file:bg-neutral-500 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white file:transition-colors hover:file:bg-neutral-600"
