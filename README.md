# Sowtime

What to plant this month, anywhere in the world. Live at **https://samusotres.github.io/sowtime/**

A single-file website: `index.html` contains the page, the planting engine and the plant database.
No server, database or build step is needed.

## Put it online (about 5 minutes, free)

Any static host works. Easiest options:

- **Netlify Drop**: go to app.netlify.com/drop and drag the folder containing `index.html` onto the page.
- **Cloudflare Pages**: Workers & Pages → Create → Pages → Upload assets → upload `index.html`.
- **GitHub Pages**: create a repository, upload `index.html`, then Settings → Pages → deploy from the main branch.

Then connect your own domain in the host's settings.

## How it gets its data

| What | Source | Terms |
|---|---|---|
| Day highs and night lows | NASA POWER daily data 2014–2023, averaged per month in the browser | CC BY 4.0, no use restrictions. Credit is in the footer. |
| Rain and sunshine | NASA POWER climatology | CC BY 4.0 |
| Ground elevation (corrects the ~50 km climate grid to the real altitude, 6.5 °C per 1,000 m) | AWS Terrain Tiles (Mapzen) | Open data, credited in the footer |
| Place search and "use my location" | Photon public API (komoot), OpenStreetMap data | Free, fair use. Credit is in the footer. |
| Plants (162) | Embedded; built from the plant database v0.1 | Yours, plus CC0/MIT parts credited in the footer |

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
- Full interface and plant texts in English, German, Spanish, French, Italian and Dutch; °C or °F.

## Files

- `index.html` — the website to upload.
- `src/` — editable sources: `template.html` (page), `engine.js` (planting rules), `plants.min.json`,
  `samples.json`, `i18n/` (interface strings and plant texts per language), `build_site.py` (rebuilds the page into
  `dist/`; copy `dist/index.html` to the repo root), `test_engine.js` (prints planting matrices in Node).

## Ideas for the next version

- One page per city and month ("What to plant in Graz in March") for search traffic.
- Seed-shop affiliate links on plant cards, and an email reminder per month.
- More languages and more plants.
