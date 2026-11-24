"use client";

import * as React from "react";
import { ChevronDown, Home, MapPin, Plane, Search } from "lucide-react";

import {
  HOME_LOCATION,
  TRAVEL_DEFAULT,
  codeToCondition,
  fetchForecast,
  geocodeCity,
  type Location,
  type ForecastDay,
} from "@/lib/weather";

const CACHE_TTL = 60 * 60 * 1000; // 1 hour (VAL-WEATHER-03)

const cacheKey = (loc: Location) => `weather:${loc.lat.toFixed(2)},${loc.lon.toFixed(2)}`;

const weekday = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(
    new Date(`${iso}T12:00:00`),
  );

/** The persisted chosen location for this widget, or its default. Client-only. */
function savedLocation(storageKey: string, fallback: Location): Location {
  if (typeof window !== "undefined") {
    try {
      const s = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (s?.name && typeof s.lat === "number" && typeof s.lon === "number") {
        return s as Location;
      }
    } catch {
      /* ignore */
    }
  }
  return fallback;
}

/**
 * Header weather chip (specs/weather). Two flavours:
 *  - `home`: defaults to the home city; a "use my location" (geolocation) toggle.
 *  - `travel`: a travel destination (default Vienna) changeable by typing a city.
 * Client-side (Open-Meteo is keyless + CORS), cached ~1h; renders nothing until it has data.
 */
export function WeatherWidget({ kind }: { kind: "home" | "travel" }) {
  const fallback = kind === "home" ? HOME_LOCATION : TRAVEL_DEFAULT;
  const storageKey = `weather:${kind}`;
  const KindIcon = kind === "home" ? Home : Plane;

  const [loc, setLoc] = React.useState<Location>(() => savedLocation(storageKey, fallback));
  const [days, setDays] = React.useState<ForecastDay[] | null>(null);
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const rootRef = React.useRef<HTMLDivElement>(null);

  const isDefault = loc.lat === fallback.lat && loc.lon === fallback.lon;

  // Load the forecast for the active location: cache-first, then refresh.
  React.useEffect(() => {
    let cancelled = false;
    const key = cacheKey(loc);
    void (async () => {
      let hadCache = false;
      try {
        const c = JSON.parse(localStorage.getItem(key) || "null");
        if (c && Date.now() - c.fetchedAt < CACHE_TTL && Array.isArray(c.days)) {
          hadCache = true;
          if (!cancelled) setDays(c.days as ForecastDay[]);
        }
      } catch {
        /* ignore */
      }
      try {
        const d = await fetchForecast(loc.lat, loc.lon);
        if (cancelled) return;
        setDays(d);
        try {
          localStorage.setItem(key, JSON.stringify({ fetchedAt: Date.now(), days: d }));
        } catch {
          /* ignore */
        }
      } catch {
        if (!cancelled && !hadCache) setDays([]); // unavailable → render nothing
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loc]);

  // Close the popover on outside click / Esc.
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (l: Location) => {
    setLoc(l);
    setErr(null);
    try {
      localStorage.setItem(storageKey, JSON.stringify(l));
    } catch {
      /* ignore */
    }
  };

  const resetDefault = () => {
    setLoc(fallback);
    setErr(null);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  };

  const geolocate = () => {
    if (!navigator.geolocation) {
      setErr("Location unavailable");
      return;
    }
    setBusy(true);
    setErr(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        choose({
          name: "Current location",
          lat: Number(pos.coords.latitude.toFixed(2)),
          lon: Number(pos.coords.longitude.toFixed(2)),
        });
        setBusy(false);
      },
      () => {
        setErr("Couldn't get your location");
        setBusy(false);
      },
      { timeout: 10000 },
    );
  };

  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setBusy(true);
    setErr(null);
    const found = await geocodeCity(q);
    setBusy(false);
    if (found) {
      choose(found);
      setQuery("");
    } else {
      setErr(`No match for "${q}"`);
    }
  };

  // Nothing yet (loading) or unavailable → render nothing (VAL-WEATHER-04).
  if (!days || days.length === 0) return null;

  const today = days[0];
  const { Icon: TodayIcon, label } = codeToCondition(today.code);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`${kind === "home" ? "Home" : "Travel"} weather (${loc.name}): ${label}, ${today.hi} degrees`}
        aria-expanded={open}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <KindIcon className="size-3.5" />
        <TodayIcon className="size-4" />
        <span className="tabular-nums">{today.hi}°</span>
        <ChevronDown className="size-3" />
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-1 w-72 border bg-background p-2 shadow-md">
          <div className="mb-1 flex items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
            <span className="flex min-w-0 items-center gap-1">
              {isDefault ? <KindIcon className="size-3 shrink-0" /> : <MapPin className="size-3 shrink-0" />}
              <span className="truncate">{loc.name}</span>
            </span>
            {kind === "home" ? (
              isDefault ? (
                <button
                  type="button"
                  onClick={geolocate}
                  disabled={busy}
                  className="shrink-0 hover:text-foreground disabled:opacity-50"
                >
                  {busy ? "Locating…" : "Use my location"}
                </button>
              ) : (
                <button type="button" onClick={resetDefault} className="shrink-0 hover:text-foreground">
                  Home
                </button>
              )
            ) : !isDefault ? (
              <button type="button" onClick={resetDefault} className="shrink-0 hover:text-foreground">
                Reset
              </button>
            ) : null}
          </div>

          {kind === "travel" ? (
            <form onSubmit={onSearch} className="mb-1 flex items-center gap-1 px-1">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Change city…"
                aria-label="Change destination city"
                className="h-7 w-full border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
              <button
                type="submit"
                disabled={busy}
                aria-label="Search city"
                className="shrink-0 text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                <Search className="size-3.5" />
              </button>
            </form>
          ) : null}

          {err ? <p className="px-1 pb-1 text-xs text-destructive">{err}</p> : null}

          <ul className="text-sm">
            {days.map((d, i) => {
              const { Icon, label: dl } = codeToCondition(d.code);
              return (
                <li key={d.date} className="flex items-center gap-2 px-1 py-1">
                  <span className="w-36 shrink-0 text-muted-foreground">
                    <span className="mr-1 inline-block w-9">
                      {i === 0 ? "Today" : weekday(d.date)}
                    </span>
                    <span className="tabular-nums">{d.date}</span>
                  </span>
                  <Icon className="size-4 shrink-0" aria-label={dl} />
                  <span className="ml-auto tabular-nums">
                    <strong>{d.hi}°</strong>{" "}
                    <span className="text-muted-foreground">{d.lo}°</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
