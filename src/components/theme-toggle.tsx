"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

/**
 * Light/dark toggle. The icon is driven purely by Tailwind's `dark:` variants,
 * so it renders correctly before hydration without a `mounted` guard (next-themes
 * sets the `dark` class on <html> before React runs). The current theme is only
 * read inside onClick, which always runs on the client.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Moon className="size-5 dark:hidden" />
      <Sun className="hidden size-5 dark:block" />
    </Button>
  );
}
