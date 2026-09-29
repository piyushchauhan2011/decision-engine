# Elsewhere — hotel page decisions demo

TanStack Start SSR demo with a SQLite/Drizzle catalog and pure, pre-render decision resolution. The source .NET project is only a text/visual reference; this app neither calls it nor needs its database. Illustrative catalog images are reused decoratively, not as evidence of a destination's appearance.

## Run

Requires Node.js and pnpm. From this directory:

```sh
pnpm install
pnpm db:setup
pnpm dev --host 127.0.0.1
```

Open http://127.0.0.1:3000/ or `/destinations`. `DB_FILE_NAME` optionally points to a different SQLite file (default `./local.db`); run `DB_FILE_NAME=./other.db pnpm db:setup` before using a new file. The app intentionally errors with a setup instruction if the catalog is absent or empty. Seeding upserts the seven places and three featured hotels without deleting unrelated records. Schema changes: `pnpm db:generate`, then `pnpm db:migrate`.

```sh
pnpm lint
pnpm format:check
pnpm format                     # write formatting changes
pnpm typecheck
pnpm test
pnpm build
pnpm start
pnpm exec playwright install chromium  # only if Chromium is not installed
pnpm test:e2e                    # expects a pre-seeded local.db
```

`pnpm start` serves the Nitro Node build from `.output/server/index.mjs`; set `PORT` to change its port. Native `better-sqlite3` must be built for the server's OS/architecture. The Playwright config starts a dev server if port 3000 is free and otherwise reuses one.

## Developer tooling

TypeScript 6 checks the app with `pnpm typecheck`. Oxlint checks TypeScript/JavaScript; Stylelint checks CSS against `stylelint-config-standard`; Oxfmt formats source, tests, configuration, and this README. `pnpm lint` runs both linters, and `pnpm format:check` checks formatting without writing. Generated `src/routeTree.gen.ts`, lockfile metadata, and the reference `CHATS.md` are excluded from formatting.

`pnpm install` runs the Husky `prepare` script in a Git checkout. The pre-commit hook runs lint-staged: Oxfmt formats staged supported files, Oxlint checks staged TS/JS files, and Stylelint checks staged CSS. The workspace only permits native install scripts for `better-sqlite3` and `esbuild`.

## Decisions

`src/decisions/` owns defaults, the validated rule/experiment registry, assignment bucketing and provenance. `arrival-flow` changes hero, search and destination card layouts together; `destination-density` changes both grids. The India seasonal-offers rule needs both `country=IN` and `offers=on`. The inspector can force `control` or `treatment`, or leave each experiment on `auto`; URL controls preserve the destination filter while navigating. Invalid URL overrides are ignored and listed; an unknown destination shows a clear action. The home catalog renders six alphabetized destinations and three selected stays; the full index renders seven.

The server resolves values and assignments in loaders before HTML rendering. An HTTP-only visitor UUID cookie keeps `auto` assignments stable across requests when cookies are accepted; without cookies an assignment is request-scoped, though each response still hydrates consistently. FNV-1a over UTF-16 code units assigns <50 buckets to control. The app sets `Cache-Control: private, no-store` on personalized pages. The inspector is a local demonstration, not remote feature management, analytics or exposure tracking.
