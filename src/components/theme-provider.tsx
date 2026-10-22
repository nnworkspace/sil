"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Thin wrapper around next-themes so we can drop <ThemeProvider> into the
 * root layout. `attribute="class"` toggles the `dark` class that Tailwind and
 * shadcn use for dark mode.
 */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
