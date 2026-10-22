"use client";

import * as React from "react";

import {
  geocodeCity,
  fetchForecast,
  codeToCondition,
  type ForecastDay,
} from "@/lib/weather";

const weekday = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(
    new Date(`${iso}T12:00:00`),
  );

/** Compact, display-only destination forecast (SPEC-TRIPS-INT §3.2). Reuses the
 *  weather lib (Open-Meteo, keyless). Renders nothing while loading or if the
 *  lookup fails — never blocks the page (v1). */
export function TripForecast({ destination }: { destination: string }) {
  const [days, setDays] = React.useState<ForecastDay[] | null>(null);
  const [place, setPlace] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const loc = await geocodeCity(destination);
        if (!loc || cancelled) return;
        const d = await fetchForecast(loc.lat, loc.lon);
        if (cancelled) return;
        setPlace(loc.name);
        setDays(d.slice(0, 7));
      } catch {
        /* non-blocking: leave the strip absent */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [destination]);

  if (!days || days.length === 0) return null;

  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 text-xs text-muted-foreground">
        Forecast{place ? ` · ${place}` : ""}
      </div>
      <ul className="flex gap-3 overflow-x-auto">
        {days.map((d, i) => {
          const { Icon, label } = codeToCondition(d.code);
          return (
            <li key={d.date} className="flex shrink-0 flex-col items-center gap-1 text-center">
              <span className="text-xs text-muted-foreground">
                {i === 0 ? "Today" : weekday(d.date)}
              </span>
              <Icon className="size-5" aria-label={label} />
              <span className="text-xs tabular-nums">
                <strong>{d.hi}°</strong>{" "}
                <span className="text-muted-foreground">{d.lo}°</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
