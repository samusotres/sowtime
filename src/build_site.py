#!/usr/bin/env python3
"""Assemble the single-file website.
dist/artifact.html : body content for the Claude artifact preview (the host adds <html>/<head>)
dist/index.html    : complete standalone page to upload to any static host
"""
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(os.path.dirname(HERE), "dist")
os.makedirs(DIST, exist_ok=True)

def js_json(path):
    s = json.dumps(json.load(open(path, encoding="utf-8")), ensure_ascii=False, separators=(",", ":"))
    return s.replace("</", "<\\/")

# Plants left out of the website because they (or their seeds/bulbs/raw roots) are well known to be poisonous.
EXCLUDE = {"sweet_pea", "larkspur", "daffodil", "lupin", "morning_glory", "gladiolus", "cassava"}

def merged_plants():
    plants = [p for p in json.load(open(os.path.join(HERE, "plants.min.json"), encoding="utf-8")) if p["id"] not in EXCLUDE]
    by = {p["id"]: p for p in plants}
    for p in plants:
        p["comp"] = [c for c in p.get("comp") or [] if c in by]
    for p in plants:
        p["d"], p["tip"] = {}, {}
        p.pop("desc", None); p.pop("descSrc", None); p.pop("notes", None)
    for lang in ["en", "de", "es", "fr", "it", "nl", "pt"]:
        for line in open(os.path.join(HERE, "i18n", "plants_%s.psv" % lang), encoding="utf-8").read().strip().split("\n"):
            f = line.split("|")
            pid = f[0]
            if pid not in by: continue
            if lang in ("nl", "pt"):
                by[pid]["n"][lang] = f[1]; f = [pid] + f[2:]
            by[pid]["d"][lang] = f[1]; by[pid]["tip"][lang] = f[2]
    return json.dumps(plants, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")

tpl = open(os.path.join(HERE, "template.html"), encoding="utf-8").read()
engine = open(os.path.join(HERE, "engine.js"), encoding="utf-8").read()
page = (tpl.replace("/*__ENGINE__*/", engine)
           .replace("/*__PLANTS__*/[]", merged_plants())
           .replace("/*__UI__*/{}", js_json(os.path.join(HERE, "i18n", "ui.json")))
           .replace("/*__SAMPLES__*/[]", js_json(os.path.join(HERE, "samples.json"))))
assert "__UI__" not in page and "__PLANTS__" not in page and "__SAMPLES__" not in page and "__ENGINE__" not in page
open(os.path.join(DIST, "artifact.html"), "w", encoding="utf-8").write(page)

# Standalone: move <title>, metas, font links and <style> into a real <head>.
head_parts, body = [], page
for pat in [r"<title>.*?</title>\n", r'<meta name="claude:viewport-fit-sides"[^>]*>\n', r'<meta name="description"[^>]*>\n',
            r"<link [^>]*>\n", r"<style>.*?</style>\n"]:
    for m in re.findall(pat, body, flags=re.S):
        if "claude:" in m or "fonts.g" in m:
            body = body.replace(m, "", 1); continue
        head_parts.append(m); body = body.replace(m, "", 1)
fonts = ("<style>@font-face{font-family:'Young Serif';src:url(fonts/YoungSerif-Regular.ttf) format('truetype');font-weight:400;font-display:swap}"
         "@font-face{font-family:'Figtree';src:url(fonts/Figtree.ttf) format('truetype');font-weight:300 900;font-display:swap}</style>\n")
reset = ("<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}"
         "body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>\n")
standalone = ("<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n"
              "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n"
              "<link rel=\"canonical\" href=\"https://sowtime.net/\">\n"
              "<link rel=\"icon\" href=\"/favicon.ico\" sizes=\"48x48\">\n"
              "<link rel=\"icon\" href=\"/favicon.svg\" type=\"image/svg+xml\">\n"
              "<link rel=\"apple-touch-icon\" href=\"/apple-touch-icon.png\">\n"
              "<link rel=\"manifest\" href=\"/site.webmanifest\">\n"
              "<meta name=\"theme-color\" content=\"#2d6a43\">\n"
              + reset + fonts + "".join(head_parts) + "</head>\n<body>\n" + body + "\n</body>\n</html>\n")
open(os.path.join(DIST, "index.html"), "w", encoding="utf-8").write(standalone)
for f in ("artifact.html", "index.html"):
    print(f, os.path.getsize(os.path.join(DIST, f)), "bytes")


# ---- Security headers for Cloudflare (public/_headers), with hashes of the page's inline scripts ----
import base64, hashlib
def write_headers(html):
    hashes = []
    for sc in re.findall(r"<script>(.*?)</script>", html, flags=re.S):
        hashes.append("'sha256-" + base64.b64encode(hashlib.sha256(sc.encode("utf-8")).digest()).decode() + "'")
    csp = "; ".join([
        "default-src 'self'",
        "script-src 'self' " + " ".join(hashes),
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https://s3.amazonaws.com",
        "font-src 'self'",
        "connect-src 'self' https://archive-api.open-meteo.com https://power.larc.nasa.gov https://photon.komoot.io",
        "manifest-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'none'",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests",
    ])
    out = """/*
  Content-Security-Policy: %s
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(self), camera=(), microphone=(), payment=(), usb=(), interest-cohort=()
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin

/index.html
  Cache-Control: public, max-age=0, must-revalidate

/fonts/*
  Cache-Control: public, max-age=31536000, immutable
""" % csp
    open(os.path.join(DIST, "_headers"), "w", encoding="utf-8").write(out)
    print("_headers with", len(hashes), "script hashes")

write_headers(standalone)
