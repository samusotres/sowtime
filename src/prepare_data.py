#!/usr/bin/env python3
"""Convert the plant database JSON into the compact records the website embeds."""
import json, sys, os
src = sys.argv[1]
out = sys.argv[2]
d = json.load(open(src, encoding="utf-8"))
recs = []
for p in d["plants"]:
    g = p["germination_soil_c"]
    recs.append(dict(
        id=p["id"], n=p["names"], bin=p["binomial"], fam=p["family"], cat=p["category"], cycle=p["cycle"],
        edible=p["edible_part"], season=p["season"], frost=p["frost"]["tolerance"], minSurvive=p["frost"]["min_survive_c"],
        germ=None if g is None or g["optimal"][0] is None else [g["min"], g["optimal"][0], g["optimal"][1]],
        soilMin=None if g is None else g["min"],
        grow=[p["growing_air_c"]["min"], *p["growing_air_c"]["optimal"], p["growing_air_c"]["max"]],
        dtm=[p["days_to_harvest"]["min"], p["days_to_harvest"]["max"]], dtmFrom=p["days_to_harvest"]["counted_from"],
        methods="".join(p["methods"]), indoorWeeks=p["indoor_weeks"], sun=p["sun"], spacing=p["spacing_cm"],
        height=p["height_cm"], daylength=p["daylength"], chill=p["needs_winter_chill"], notes=p["notes"],
        desc=p["description"], descSrc=p["description_source"], comp=p["companions"]))
# germ is used for seed rules; for tuber crops keep the planting soil minimum in soilMin
for r in recs:
    if r["germ"] is None and r["soilMin"] is not None:
        r["germ"] = None
json.dump(recs, open(out, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(len(recs), "plants ->", out, os.path.getsize(out), "bytes")
