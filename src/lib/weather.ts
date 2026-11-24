/**
 * Weather helpers (specs/weather). Open-Meteo is free, keyless, and CORS-enabled,
 * so the widget fetches it directly from the client: no server route, no secret.
 */

import {
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudRain,
  CloudSnow,
  CloudLightning,
  type LucideIcon,
} from "lucide-react";

export type Location = { name: string; lat: number; lon: number };
export type ForecastDay = { date: string; code: number; hi: number; lo: number };

/** Home location default (VAL-WEATHER-06); a settings UI to change it is future. */
export const HOME_LOCATION: Location = { name: "Berlin", lat: 52.52, lon: 13.405 };

/** Travel-destination default; the owner can change it (geocoded). */
export const TRAVEL_DEFAULT: Location = { name: "Vienna", lat: 48.2082, lon: 16.3738 };

/** Resolve a typed city name to a location via Open-Meteo's free geocoder. */
export async function geocodeCity(name: string): Promise<Location | null> {
  const url =
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}` +
    `&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const r = data?.results?.[0];
  if (!r || r.latitude == null || r.longitude == null) return null;
  return {
    name: r.name,
    lat: Number(Number(r.latitude).toFixed(2)),
    lon: Number(Number(r.longitude).toFixed(2)),
  };
}

/** Map a WMO weathercode to a legible condition + icon (SPEC-WEATHER-FUNC §3). */
export function codeToCondition(code: number): { label: string; Icon: LucideIcon } {
  if (code === 0) return { label: "Clear", Icon: Sun };
  if (code <= 2) return { label: "Partly cloudy", Icon: CloudSun };
  if (code === 3) return { label: "Cloudy", Icon: Cloud };
  if (code === 45 || code === 48) return { label: "Fog", Icon: CloudFog };
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82))
    return { label: "Rain", Icon: CloudRain };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86)
    return { label: "Snow", Icon: CloudSnow };
  if (code >= 95) return { label: "Thunderstorm", Icon: CloudLightning };
  return { label: "Cloudy", Icon: Cloud }; // unknown → cloudy
}

/** Fetch a 10-day daily forecast from Open-Meteo for the given coordinates. */
export async function fetchForecast(lat: number, lon: number): Promise<ForecastDay[]> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&daily=weathercode,temperature_2m_max,temperature_2m_min&forecast_days=10&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const data = await res.json();
  const time: string[] = data?.daily?.time ?? [];
  return time.map((date, i) => ({
    date,
    code: Number(data.daily.weathercode[i]),
    hi: Math.round(data.daily.temperature_2m_max[i]),
    lo: Math.round(data.daily.temperature_2m_min[i]),
  }));
}
