# Norcha Print — website

The website for **Norcha Print**, a print shop in Bole, Addis Ababa. Bilingual **EN / አማርኛ**, one page,
static, no build step. Customers browse products and order over **WhatsApp**.

**Live: https://norchaprint.com** (+ `www`)

| | |
|---|---|
| host | Cloudflare Pages — project `norcha-print` |
| deploy | **every push to `main`** → `.github/workflows/deploy-pages.yml` → live in ~1 minute |
| stack | plain HTML + CSS + JS. No framework, no bundler, no npm, no server. |

## Start here

1. **[`TOBIA-START-HERE.md`](TOBIA-START-HERE.md)** — how to work on this repo, how it deploys, and the rules
2. **[`STATE.md`](STATE.md)** — what is live, what is still placeholder, and the open work by ID
3. **[`DESIGN.md`](DESIGN.md)** — the locked design canon (read before changing any colour, font or spacing)

## Files

| path | what |
|---|---|
| `index.html` | **the entire site.** One long page: hero, products, sizes & prices, photo guide, "see it on the wall", FAQ, delivery, order form. |
| `css/` | stylesheets and design tokens |
| `js/` | language toggle, carousel, order composer, service-worker registration |
| `img/` | product images (WebP + JPEG fallbacks), OG share card |
| `fonts/` | self-hosted display/body faces, incl. Noto Sans Ethiopic for Amharic |
| `sw.js` `manifest.webmanifest` | offline shell + installable PWA |
| `DESIGN.md` `styleguide.html` | **internal** — the canon and the visual reference. Shared for maintainers, **not part of the public site.** |

## Rules of this repo

- 🔴 **This repo is public and it is the deploy source. Everything committed is public.** No credentials, no
  commercial terms, no internal notes — not in files, not in commit messages.
- 🔴 **Never force-push.** Never rewrite history.
- **The site must stay deployable by a plain static host, forever.** No build step is to be introduced.
- **Every change is verified on the live page after deploy** — looking at it, at desktop and at phone width.
  Correct source code that renders wrong is still a bug; this project has shipped one before.
- `STATE.md` is updated in the same commit as the change it describes.

## Why the deploy is a GitHub Action and not Cloudflare's Git integration

Connecting the repo in the Cloudflare dashboard **loops**: GitHub reports the authorisation as successful,
Cloudflare never registers the installation (API error `8000011`). Deploying from Actions gives the same
outcome — push to `main`, site updates — with no OAuth dance.

Required repository secrets (already configured): `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

The workflow stages **only visitor files** (`rsync` excludes `.git`, `.github`, `*.md`, `.gitignore`), so
internal documents are never published to the site.
