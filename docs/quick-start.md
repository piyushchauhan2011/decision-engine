# Quick start

Requires Node.js 20.19.x or >=22.12 (Vite 8), pnpm, and a working native build of `better-sqlite3` for your platform. From the repository root:

```sh
pnpm install
pnpm db:setup
pnpm dev --host 127.0.0.1
```

Open <http://127.0.0.1:3000/> and <http://127.0.0.1:3000/destinations>. The first page has six alphabetized destinations and three featured stays; the index has seven destinations. Choose a destination from the home search to filter the index. Unknown slugs show an empty state with a clear-filter link. The bottom-right inspector lets you force experiment variants and visitor/flag inputs; see [Experimentation](experimentation.md).

`DB_FILE_NAME` defaults to `./local.db`. To use another SQLite file, set the **same** variable when preparing and running the app:

```sh
DB_FILE_NAME=./other.db pnpm db:setup
DB_FILE_NAME=./other.db pnpm dev --host 127.0.0.1
```

`db:setup` runs the checked-in Drizzle migration then upserts seven destinations and three curated hotels. Reseeding leaves unrelated catalog rows intact. Missing, unmigrated, or unseeded databases fail with a `pnpm db:setup` instruction instead of fabricated catalog data. After changing `src/db/schema.ts`, run `pnpm db:generate` to produce a migration, then `pnpm db:migrate` and `pnpm db:seed`.

## Checks and production run

```sh
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
pnpm start
```

`pnpm start` serves the built Nitro Node server from `.output/server/index.mjs`; set `PORT` to change its port. For browser checks, seed the default `local.db` first, then run:

```sh
pnpm exec playwright install chromium  # only if Chromium is missing
pnpm test:e2e
```

Playwright starts its own dev server on port 3100 and fails if the port is occupied. To format changed files, run `pnpm format`; `pnpm format:check` does not write. `pnpm install` installs the Git pre-commit hook (Husky/lint-staged); the hook formats supported staged files and lints staged TS/JS/CSS. `pnpm db:seed` uses `oxnode` and does not type-check the script; run `pnpm typecheck` separately.

Production requires a stable private `DECISION_COOKIE_SECRET` of at least 32 UTF-8 bytes; missing or short secrets prevent startup. Put it in the git-ignored `.env` as `DECISION_COOKIE_SECRET=<private random value>` and run `NODE_ENV=production PORT=3102 pnpm start`. The start script loads `.env` if present; externally supplied environment variables take precedence, so deployments can inject the secret without a file. Rotating it replaces existing visitor cookies. `DECISION_DISABLED_EXPERIMENTS` is an optional comma-separated list of registered experiment IDs, applied after restart without redistributing their slots. `DECISION_SEASONAL_OFFERS=on` and `DECISION_PLANNING_GUIDE=on` enable the corresponding trusted flags; unset/empty means off, and other nonempty values or unknown disabled IDs fail startup. Production ignores public experiment/country/flag overrides, omits the inspector, and uses country `US` until trusted geography exists. Personalized HTML is private and must revalidate on normal HTTP reuse.

For performance audits, test `pnpm build && pnpm start` rather than the Vite dev server. The production response inlines the small shared stylesheet (~11 KB) so first paint does not wait for another CSS request; this repeats those bytes in each HTML response. Nitro emits Brotli/Gzip variants of public assets and serves them when `Accept-Encoding` requests them. Fingerprinted `/assets/` retain a one-year immutable cache; original `/images/` files and IPX `/image/<width>/<filename>.webp` responses retain seven days. IPX produces width-limited, quality-72 WebP images from local files only. The endpoint reads `public/images` in development or `.output/public/images` in a built deployment (run the server from the project root). The home route preloads the hero width selected by viewport; below-fold hotel images use low fetch priority.

Personalized HTML uses `Cache-Control: private, no-cache`: shared caches must not store it, and normal HTTP reuse must revalidate, while the browser may retain a private copy or restore it from back/forward cache. Do not use this policy for pages with sensitive personal data; `no-store` protects that content more strictly but prevents back/forward cache eligibility in affected browsers. `src/server/compression.ts` streams Brotli or Gzip for Nitro's dynamic HTML when the client advertises support, sets `Vary: Accept-Encoding`, and leaves other responses untouched; identity responses remain available. Nitro's precompressed public assets are served separately. A reverse proxy/CDN must not compress already encoded responses again or publicly cache personalized HTML. The app uses system and Georgia fonts, so there are no font downloads to preload. Route UI already builds into separate chunks; the large entry still includes React, Router, and hydration, so further arbitrary chunk splitting could add critical network round trips without removing code.

## Measure performance

After seeding the catalog and installing Playwright Chromium, run `pnpm perf:audit`. This builds the production app, starts its own server on an available loopback port, runs Lighthouse's **desktop** performance preset on `/` and `/destinations` with fixed control/US/off overrides, prints scores plus FCP/LCP/TBT/CLS, writes JSON and HTML reports under the ignored `test-results/lighthouse/<timestamp>/`, and stops its server. Run `pnpm exec playwright install chromium` if the browser is missing. Do not measure the Vite dev server.

Before and after a performance change, run the same command on the same machine with the same seeded database; inspect the saved reports and repeat measurements to distinguish noise from improvements. Scores from a different Chrome/Lighthouse version, throttling preset, hardware, or deployment proxy are not directly comparable. The command records evidence; it does not fail on a fluctuating score threshold or replace the route/e2e checks.

The app does not require the reference .NET app or its PostgreSQL database. Catalog text is seeded locally; reused illustrations are decorative, not claims about the locations depicted.
