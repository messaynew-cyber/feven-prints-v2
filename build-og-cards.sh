#!/usr/bin/env bash
# build-og-cards.sh — rasterise the 1200x630 social cards on the VPS.
#
# The card HTML is written here; the pixels are made there. That split is
# deliberate: Chromium rendering eleven 1200x630 canvases is exactly the kind
# of work this phone should not be doing, and the VPS already has Playwright
# wired up for screenshots.
#
# Fonts and product images are loaded from the LIVE site rather than uploaded,
# so the card is guaranteed to be using the same type and the same photograph
# the page does.
#
# RUN:  bash build-og-cards.sh
set -euo pipefail
cd "$(dirname "$0")"

VPS="ubuntu@129.80.112.9"
KEY="$HOME/key.pem"
REMOTE="/tmp/norcha_og_$$"

echo "── 1. card sources ────────────────────────────────────────"
node build-og-cards.js

echo "── 2. ship to the VPS ─────────────────────────────────────"
ssh -i "$KEY" -o ConnectTimeout=10 "$VPS" "mkdir -p $REMOTE"
scp -q -i "$KEY" .ogtmp/*.html "$VPS:$REMOTE/"

echo "── 3. rasterise (1200x630, device scale 1) ────────────────"
ssh -i "$KEY" "$VPS" "python3 -" <<PYEOF
import glob, os
from playwright.sync_api import sync_playwright
files = sorted(glob.glob("$REMOTE/*.html"))
print("cards:", len(files))
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    page = b.new_page(viewport={'width':1200,'height':630}, device_scale_factor=1)
    errors = []
    page.on("console", lambda m: errors.append(m.text[:120]) if m.type == "error" else None)
    for f in files:
        slug = os.path.basename(f)[:-5]
        page.goto("file://" + f, wait_until='load', timeout=45000)
        # the type must be the real type: wait for the webfonts, then the images
        page.evaluate("() => document.fonts.ready")
        page.wait_for_timeout(1200)
        page.screenshot(path="$REMOTE/" + slug + ".jpg", type='jpeg', quality=92)
        print("  ✓", slug, os.path.getsize("$REMOTE/" + slug + ".jpg"), "bytes")
    if errors:
        print("console errors:", errors[:5])
    b.close()
PYEOF

echo "── 4. pull the JPGs back ──────────────────────────────────"
mkdir -p img/og
scp -q -i "$KEY" "$VPS:$REMOTE/*.jpg" img/og/
rm -f img/og/../og/*.html 2>/dev/null || true
ssh -i "$KEY" "$VPS" "rm -rf $REMOTE"

echo "── 5. result ──────────────────────────────────────────────"
for f in img/og/*.jpg; do
  printf "  %-28s %s\n" "$(basename "$f")" "$(identify -format '%wx%h %b' "$f")"
done
echo "  total: $(du -sh img/og | cut -f1)"
