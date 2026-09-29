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

For performance audits, test `pnpm build && pnpm start` rather than the Vite dev server. Nitro serves fingerprinted `/assets/` with a one-year immutable cache and stable-name `/images/` with a seven-day cache; personalized HTML remains `private, no-store`. Production deployments should enable HTTP compression at the reverse proxy/CDN for dynamic HTML. The home route preloads its hero image; other routes do not.

The app does not require the reference .NET app or its PostgreSQL database. Catalog text is seeded locally; reused illustrations are decorative, not claims about the locations depicted.
