# Sowtime

What to plant this month, anywhere in the world. Live at **https://sowtime.net**

A single-file website: `index.html` contains the page, the planting engine and the plant database.
No server, database or build step is needed.

## Hosting

The site is hosted on **Cloudflare Pages**, connected to this repository. Every push to `main` deploys automatically.

- Build command: *(none)*
- Build output directory: `public`
- Custom domains: `sowtime.net` and `www.sowtime.net`

`public/` is everything that is served: `index.html` (page, planting engine and plant database in one file), `fonts/`,
`_headers` (security and cache headers), `robots.txt` and `sitemap.xml`. The `index.html` in the repository root only
redirects old GitHub Pages visitors to sowtime.net.

## How it gets its data

| What | Source | Terms |
|---|---|---|
| Average temperature, average daily high/low, frost nights, rain, sunshine | Open-Meteo historical weather API (ERA5/ERA5-Land reanalysis, downscaled to the location's elevation), daily values 2006–2025 averaged per month in the browser | Free for non-commercial use, data CC BY 4.0. Credit is in the footer. |
| Backup if Open-Meteo is unavailable | NASA POWER daily data, corrected for elevation with AWS Terrain Tiles | CC BY 4.0 / open data |
| Place search and "use my location" | Photon public API (komoot), OpenStreetMap data | Free, fair use. Credit is in the footer. |
| Plants (155) | Embedded; built from the plant database v0.1 | Yours, plus CC0/MIT parts credited in the footer |

Climate results are cached in each visitor's browser, so returning visitors don't call NASA again.

**Test after deploying.** The live lookups could not be tested from the build environment (outside APIs are
blocked there), so search for 2–3 places once the site is online. If a lookup fails, the page falls back to
the 22 built-in sample cities and says so.

**When traffic grows:** Photon's public server is meant for moderate use. Beyond a few thousand searches a day,
run your own Photon instance or switch to a paid geocoder (the `geocode()` function is the only place to change).

## What the page does

- Search any town, or use the device location.
- Choose the month (defaults to the current one) and how much direct sun the bed gets
  (full sun, part sun, part shade, shade).
- Sun setting changes the results in two ways: plants that need more light are moved to "Not this month"
  with the reason, and shaded beds are modelled as cooler by day (up to 2.5 °C) while full sun warms them.
- **Plant now**: cards rated Ideal / Good / Possible, with the task (sow outdoors, start indoors, plant
  seedlings, plant bulbs/tubers), the expected harvest months, and a seed-packet style sow/harvest strip.
- **Year planner**: every plant × 12 months for that location.
- **Climate**: temperature and rain chart, sun on the bed vs open ground, month-by-month table.
- Full interface and plant texts in English, German, Spanish, French, Italian, Dutch and Portuguese; °C or °F.

## Files

- `public/` — the website as served by Cloudflare Pages.
- `src/` — editable sources: `template.html` (page), `engine.js` (planting rules), `plants.min.json`,
  `samples.json`, `i18n/` (interface strings and plant texts per language), `build_site.py` (rebuilds the page into
  `dist/`; copy `dist/index.html` to `public/index.html`), `test_engine.js` (prints planting matrices in Node).

## Ideas for the next version

- One page per city and month ("What to plant in Graz in March") for search traffic.
- Seed-shop affiliate links on plant cards, and an email reminder per month.
- More languages and more plants.

## Licence

Code: MIT ([`LICENSE`](LICENSE)). Plant data and texts: CC BY 4.0 ([`LICENSE-DATA`](LICENSE-DATA)).
Third-party data, fonts and services are listed in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
Fonts are served from this repository, so visitors' browsers don't contact Google.
