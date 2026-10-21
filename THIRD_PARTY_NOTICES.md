# Licences and third-party notices

## Sowtime itself

| What | Licence |
|---|---|
| Code (`public/index.html` scripts and styles, `src/*.js`, `src/*.py`, `src/template.html`) | MIT, see [`LICENSE`](LICENSE) |
| Plant database, growing parameters and plant texts in all languages (`src/plants.min.json`, `src/i18n/`), sample climate values (`src/samples.json`) | CC BY 4.0, see [`LICENSE-DATA`](LICENSE-DATA). Credit: "Sowtime contributors" with a link to this repository. |

Sowtime gives general guidance only and comes with no warranty; see the disclaimer on the website.

## Included third-party material

- **OpenFarm crop data** (used to build the plant database: varieties, spacing, companions). CC0 1.0, via [openfarm-crops-rescue](https://github.com/thefullnacho/openfarm-crops-rescue). No attribution required.
- **FarmBot Web App crop data** (variety records). MIT License, Copyright (c) 2018 Farmbot.io. [Source](https://github.com/FarmBot/Farmbot-Web-App).
- **Fonts**: Young Serif and Figtree, SIL Open Font License 1.1; see `public/fonts/OFL-*.txt`.

## Services used at runtime (not bundled)

- **Open-Meteo** historical weather API: data CC BY 4.0, free for non-commercial use. "Weather data by Open-Meteo.com", based on Copernicus ERA5 (contains modified Copernicus Climate Change Service information).
- **NASA POWER** (backup climate source): open data, CC BY 4.0. NASA POWER Project, Langley Research Center.
- **Photon** place search by komoot; map data © OpenStreetMap contributors, ODbL.
- **AWS Terrain Tiles** (backup elevation): Mapzen, with data from SRTM, GMTED2010, ETOPO1 and other public sources.
