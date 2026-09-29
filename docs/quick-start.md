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

For performance audits, test `pnpm build && pnpm start` rather than the Vite dev server. The production response inlines the small shared stylesheet (~11 KB) so first paint does not wait for another CSS request; this repeats those bytes in each HTML response. Nitro emits Brotli/Gzip variants of public assets and serves them when `Accept-Encoding` requests them. Fingerprinted `/assets/` retain a one-year immutable cache; original `/images/` files and IPX `/image/<width>/<filename>.webp` responses retain seven days. IPX produces width-limited, quality-72 WebP images from local files only. The endpoint reads `public/images` in development or `.output/public/images` in a built deployment (run the server from the project root). The home route preloads the hero width selected by viewport; below-fold hotel images use low fetch priority.

Personalized HTML remains `private, no-store`. Nitro's precompressed public assets do **not** compress SSR HTML; enable Brotli or Gzip for `text/html` at the reverse proxy/CDN, preserving `Cache-Control: private, no-store` and `Vary: Accept-Encoding`. The app uses system and Georgia fonts, so there are no font downloads to preload. Route UI already builds into separate chunks; the large entry still includes React, Router, and hydration, so further arbitrary chunk splitting could add critical network round trips without removing code.

## Measure performance

After seeding the catalog and installing Playwright Chromium, run `pnpm perf:audit`. This builds the production app, starts its own server on an available loopback port, runs Lighthouse's **desktop** performance preset on `/` and `/destinations` with fixed control/US/off overrides, prints scores plus FCP/LCP/TBT/CLS, writes JSON and HTML reports under the ignored `test-results/lighthouse/<timestamp>/`, and stops its server. Run `pnpm exec playwright install chromium` if the browser is missing. Do not measure the Vite dev server.

Before and after a performance change, run the same command on the same machine with the same seeded database; inspect the saved reports and repeat measurements to distinguish noise from improvements. Scores from a different Chrome/Lighthouse version, throttling preset, hardware, or deployment proxy are not directly comparable. The command records evidence; it does not fail on a fluctuating score threshold or replace the route/e2e checks.

The app does not require the reference .NET app or its PostgreSQL database. Catalog text is seeded locally; reused illustrations are decorative, not claims about the locations depicted.
