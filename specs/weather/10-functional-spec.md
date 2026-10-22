# Weather Strip — Functional Specification

- **Spec ID:** `SPEC-WEATHER-FUNC`
- **Part of set:** `SPEC-SET-WEATHER` v0.1.0
- **Traceability:** [ADR-0001](../../_governance-local/decisions/ADR-0001-tech-stack.md); issue #43

## 1. Purpose and scope

Defines what the weather widget shows, how the location is chosen, how raw weather codes become simple conditions, and the rules it obeys. It is a read-only convenience; it stores nothing on the server.

## 2. Operations

### 2.1 Show the forecast — `OP-WEATHER-SHOW`

- **Purpose:** show the next ~10 days at a glance.
- **Trigger:** the owner opens any page (the widget lives in the header).
- **Behaviour:** two chips — **home** (Berlin) and **travel** (destination) — each fetches its own 10-day daily forecast and shows a **compact chip**: a home/plane marker + today's condition icon + high temperature.
- **Outcome:** both chips are visible on every page; a cached forecast renders instantly, refreshing in the background when stale.

### 2.2 Expand to 10 days — `OP-WEATHER-EXPAND`

- **Purpose:** see all ten days.
- **Trigger:** the owner clicks the chip.
- **Behaviour:** a popover lists each day: weekday, condition icon, and **high / low** temperature; the active location's name is shown.
- **Outcome:** the ten-day outlook; clicking away closes it.

### 2.3 Change a chip's location — `OP-WEATHER-LOCATE`

- **Purpose:** point a chip at a different place.
- **Behaviour, by chip:**
  - **Home** — a **"Use my location"** toggle requests browser geolocation (never automatic, `VAL-WEATHER-02`); on grant, refetch for those coordinates; **"Home"** switches back. On denial, stay on home with a subtle notice.
  - **Travel** — the owner **types a city** into the change-city input; it is **geocoded** (Open-Meteo geocoder) and the chip refetches for that city; **"Reset"** returns to the default (Vienna).
- **Outcome:** the chip reflects the chosen location; the choice **persists per chip** (localStorage) until changed.

## 3. Condition mapping

Open-Meteo returns a WMO `weathercode`; the UI maps it to a small, legible set (`VAL-WEATHER-05`):

| Condition | WMO codes | Icon (lucide) |
|:--|:--|:--|
| Clear | 0 | Sun |
| Partly cloudy | 1–2 | CloudSun |
| Cloudy | 3 | Cloud |
| Fog | 45, 48 | CloudFog |
| Drizzle / rain | 51–67, 80–82 | CloudRain |
| Snow | 71–77, 85–86 | CloudSnow |
| Thunderstorm | 95–99 | CloudLightning |

Temperatures are shown in **°C**, rounded to whole degrees.

## 4. Business validation rules

| Rule ID | Validation |
|:--|:--|
| `VAL-WEATHER-01` | Uses a **keyless, free** provider (Open-Meteo); no API key, and only coordinates are sent — no wardrobe data or PII. |
| `VAL-WEATHER-02` | Geolocation is **only requested on explicit owner action** (the "use my location" toggle); the app never auto-prompts. |
| `VAL-WEATHER-03` | The forecast is **cached ~1 hour** (client-side) per location to limit requests; a fresh cache renders without a network call. |
| `VAL-WEATHER-04` | Any failure (network, provider error, geolocation denied/unavailable) **degrades gracefully** — the widget hides or shows a subtle placeholder; it never blocks or errors the page. |
| `VAL-WEATHER-05` | `weathercode` is mapped to the fixed condition set (§3); unknown codes fall back to "cloudy". |
| `VAL-WEATHER-06` | The **home** location is a configured default (city + coordinates); editing it from the UI is out of scope for now (a later settings enhancement). |

## 5. Out of scope / future

- Hourly detail, precipitation probability, wind, UV, severe-weather alerts.
- Multiple saved locations and **trip-destination** forecasts (Phase 3, weather-aware packing).
- Weather-driven outfit suggestions.
- A settings screen to change the home location.
