#!/usr/bin/env python3
"""Build the per-listing landing pages (<id>.html) for the Luce board.

The board's "Open the listing" button (app.js openDrawer) links to ./<id>.html,
so every id in data/listings.json needs a page next to index.html.

Usage (from anywhere):
  python3 tools/build_pages.py          # write pages for ids that have none
  python3 tools/build_pages.py --check  # list missing pages, exit 1 if any
  python3 tools/build_pages.py --ids a b  # (re)write only these ids

Existing pages are never overwritten unless named with --ids.
Run it after every refresh apply step, before committing.
"""
import html, json, os, re, sys

BOARD = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LISTINGS_JSON = os.path.join(BOARD, "data", "listings.json")

def eu(n):
    return "€" + f"{int(n):,}".replace(",", ".")

def clean(s):
    """Escape for HTML and keep em dashes out of user-facing copy (display only)."""
    s = "" if s is None else str(s)
    s = re.sub(r"\s*\u2014\s*", " - ", s)
    return html.escape(s, quote=True)

def where(L):
    loc = (L.get("location") or "").strip()
    reg = (L.get("region") or "").strip()
    if reg and reg.lower() not in loc.lower():
        return f"{loc}, {reg}" if loc else reg
    return loc

def render(L):
    e = clean
    size = " · ".join(p for p in [
        f"{L['sqm']} m²" if L.get("sqm") else "Size on listing",
        f"{L['beds']} bed" if L.get("beds") else None,
        f"{L['baths']} bath" if L.get("baths") else None,
    ] if p)
    land = (f"{int(L['land']):,}".replace(",", ".") + " m²") if L.get("land") else "See listing"
    agency = e(L.get("agency")) + (" · " + e(L["ref"]) if L.get("ref") else "")
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#0e0d0b">
  <title>{e(L['name'])} - {eu(L['price'])} - Luce</title>
  <style>
    :root {{ color-scheme: dark; }}
    html, body {{ margin: 0; background: #0e0d0b; color: #f4efe6; font-family: system-ui, -apple-system, sans-serif; }}
    img {{ display: block; width: 100%; height: auto; }}
    .hero {{ max-height: 70vh; object-fit: cover; }}
    .wrap {{ max-width: 640px; margin: 0 auto; padding: 22px 18px 48px; }}
    .kicker {{ letter-spacing: .16em; text-transform: uppercase; font-size: 11px; opacity: .62; }}
    h1 {{ font-weight: 560; font-size: 30px; line-height: 1.15; margin: 10px 0 6px; }}
    .price {{ font-size: 26px; margin: 0 0 8px; }}
    .where, .why, .note {{ opacity: .82; line-height: 1.5; }}
    dl {{ display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px; margin: 20px 0; }}
    dt {{ font-size: 11px; letter-spacing: .1em; text-transform: uppercase; opacity: .55; }}
    dd {{ margin: 3px 0 0; }}
    .cta {{ display: block; margin: 22px 0 8px; padding: 18px 18px; background: #f4efe6; color: #0e0d0b; text-decoration: none; font-weight: 560; border-radius: 10px; text-align: center; font-size: 18px; }}
    .back {{ color: #f4efe6; opacity: .7; }}
  </style>
</head>
<body>
  <img class="hero" src="{e(L['photo'])}" alt="{e(L['name'])}">
  <div class="wrap">
    <div class="kicker">Europe Dream Home · Luce</div>
    <h1>{e(L['name'])}</h1>
    <p class="price">{eu(L['price'])}</p>
    <p class="where">{e(where(L))}</p>
    <a class="cta" href="{e(L['url'])}" rel="noopener">Open the listing</a>
    <p class="why">{e(L.get('why'))}</p>
    <dl><div><dt>Size</dt><dd>{size}</dd></div><div><dt>Land</dt><dd>{land}</dd></div><div><dt>Pool</dt><dd>{e(L.get('pool') or 'See listing')}</dd></div><div><dt>Year</dt><dd>{e(L.get('year') or 'See listing')}</dd></div><div><dt>Agency</dt><dd>{agency}</dd></div></dl>
    <p class="note">{e(L.get('note'))}</p>
    <p><a class="back" href="./">Back to the Luce board</a></p>
  </div>
</body>
</html>
"""

def main(argv):
    listings = json.load(open(LISTINGS_JSON, encoding="utf-8"))["listings"]
    by_id = {L["id"]: L for L in listings}
    if "--ids" in argv:
        targets = argv[argv.index("--ids") + 1:]
        unknown = [i for i in targets if i not in by_id]
        if unknown:
            sys.exit(f"unknown ids: {unknown}")
    else:
        targets = [i for i in by_id if not os.path.exists(os.path.join(BOARD, i + ".html"))]
    if "--check" in argv:
        for i in targets:
            print("MISSING", i)
        print(f"{len(targets)} missing of {len(by_id)}")
        sys.exit(1 if targets else 0)
    built, failed = [], []
    for i in targets:
        L = by_id[i]
        if not L.get("url") or not L.get("name") or not L.get("price"):
            failed.append((i, "missing url/name/price"))
            continue
        with open(os.path.join(BOARD, i + ".html"), "w", encoding="utf-8") as f:
            f.write(render(L))
        built.append(i)
    print(f"built {len(built)} page(s)")
    for i, why in failed:
        print("FAILED", i, why)
    return 1 if failed else 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
