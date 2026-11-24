"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Shirt,
  LayoutGrid,
  Luggage,
  Layers,
  LogOut,
  Equal,
  Heart,
  Archive,
  MapPin,
  ChartColumn,
  BookOpen,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { signOutAction } from "@/app/auth-actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { WeatherWidget } from "@/components/weather-widget";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/** Single source of truth for both layouts: new destinations (Archive, Stats…)
 *  appear in the desktop bar and the mobile drawer automatically (#133). */
const NAV = [
  // One entry for "show me my clothes": "Wardrobe" (the category overview at /)
  // and "Browse" (the flat filtered grid) were two doors to the same wardrobe.
  // The tab is Browse and it lands on the category overview; /browse still
  // serves Favourites and any filtered/searched view.
  { href: "/", label: "Browse", icon: LayoutGrid },
  // Favourites is filtered Browse (#135), so it needs its own active check.
  { href: "/browse?favorite=1", label: "Favourites", icon: Heart, favourites: true },
  { href: "/looks", label: "Looks", icon: Layers },
  { href: "/berths", label: "Berths", icon: MapPin },
  { href: "/trips", label: "Trips", icon: Luggage },
  // The wardrobe in aggregate (#181): composition, spend, and what gets worn.
  { href: "/figures", label: "Figures", icon: ChartColumn },
  // The reference area (#213): what the pieces are made of, and how the berth
  // notation works. It is knowledge about the wardrobe rather than the wardrobe.
  { href: "/compendium", label: "Compendium", icon: BookOpen },
  // Pieces that have left the wardrobe (#142). Lives in the drawer on phones,
  // which keeps it off the cramped mobile bar at no cost.
  { href: "/archive", label: "Archive", icon: Archive },
];

type NavItem = (typeof NAV)[number];

export function SiteHeader({
  user,
}: {
  user?: { name?: string | null; email?: string | null; image?: string | null };
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = React.useState(false);

  // Browse and Favourites overlap, so they're distinguished by the filter.
  const favOn = searchParams.get("favorite") === "1";
  const isActive = (item: NavItem) => {
    if ("favourites" in item && item.favourites) {
      return pathname === "/browse" && favOn;
    }
    // The single Browse tab covers the whole browsing surface: the category
    // overview, an individual category, and the flat grid, unless the
    // favourites filter is on, which belongs to Favourites.
    if (item.href === "/") {
      return (
        pathname === "/" ||
        pathname.startsWith("/category") ||
        (pathname.startsWith("/browse") && !favOn)
      );
    }
    return pathname.startsWith(item.href);
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-serif text-lg font-normal"
        >
          <Shirt className="size-5 text-primary" />
          {/* Short enough (ADR-0013) to keep the wordmark even on phones,
              alongside the weather + theme controls and the burger. */}
          {/* The wordmark reads as a heading, not body text (owner's request). */}
          <span className="text-2xl tracking-tight">Sil</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 text-sm md:flex">
          {NAV.map((item) => {
            const { href, label, icon: Icon } = item;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors",
                  isActive(item)
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <WeatherWidget kind="home" />
          <WeatherWidget kind="travel" />
          <ThemeToggle />

          {/* Sign out lives in the bar on desktop, in the drawer on phones. */}
          {user ? (
            <form action={signOutAction} className="hidden md:block">
              <button
                type="submit"
                title={`Sign out${user.email ? ` (${user.email})` : ""}`}
                aria-label="Sign out"
                className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <LogOut className="size-4" />
              </button>
            </form>
          ) : null}

          {/* Burger: two lines, by owner's request 🍔 */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              aria-label="Open menu"
              className="flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
            >
              <Equal className="size-6" />
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="font-serif text-lg font-normal">
                  Sil
                </SheetTitle>
              </SheetHeader>

              <nav className="mt-2 flex flex-col gap-1 px-4">
                {NAV.map((item) => {
                  const { href, label, icon: Icon } = item;
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-3 text-base transition-colors",
                        isActive(item)
                          ? "bg-muted font-medium text-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="size-5" />
                      {label}
                    </Link>
                  );
                })}
              </nav>

              {user ? (
                <div className="mt-3 border-t px-4 pt-3">
                  {user.email ? (
                    <p className="truncate px-3 text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  ) : null}
                  <form action={signOutAction}>
                    <button
                      type="submit"
                      className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-3 text-base text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <LogOut className="size-5" />
                      Sign out
                    </button>
                  </form>
                </div>
              ) : null}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
