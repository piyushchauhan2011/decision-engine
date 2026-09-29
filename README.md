# Elsewhere — hotel page decisions demo

TanStack Start SSR demo with a SQLite/Drizzle catalog and pure, pre-render decision resolution. The source .NET project is only a text/visual reference; this app neither calls it nor needs its database. Illustrative catalog images are reused decoratively, not as evidence of a destination's appearance.

## Run

Requires Node.js 20.19.x or >=22.12 (Vite 8) and pnpm. From this directory:

```sh
pnpm install
pnpm db:setup
pnpm dev --host 127.0.0.1
```

Open http://127.0.0.1:3000/ or `/destinations`. `DB_FILE_NAME` optionally points to a different SQLite file (default `./local.db`); run `DB_FILE_NAME=./other.db pnpm db:setup` before using a new file. The app intentionally errors with a setup instruction if the catalog is absent or empty. Seeding upserts the seven places and three featured hotels without deleting unrelated records. Schema changes: `pnpm db:generate`, then `pnpm db:migrate`.

`src/db/catalog.server.ts` returns `neverthrow` `Result` values: missing, unmigrated, or unseeded catalogs are `setup-required` errors; unexpected database failures are `query-failed` errors. An unknown destination slug is successful with an empty list, not a database failure. Start server functions turn catalog errors into thrown route errors so the page never silently renders fake data or serializes a `Result` instance. Decision registry/ownership violations remain thrown programming errors, not recoverable catalog outcomes.

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

`pnpm start` serves the Nitro Node build from `.output/server/index.mjs`; set `PORT` to change its port. Native `better-sqlite3` must be built for the server's OS/architecture. Playwright starts its own dev server on port 3100 and fails on conflicts rather than reusing an unrelated server.

Vite 8 resolves Nitro's Vite-version mismatch and the Zod pure-comment build warnings. Nitro's generated code-splitting group still reports a missing timing `debugName`, and the Node bundle reports TanStack Router's `"use client"` directives; these originate in dependencies, not application source. They remain visible rather than being filtered. The build and production SSR are verified with those diagnostics present.

## Developer tooling

TypeScript 6 checks the app with `pnpm typecheck`. Oxlint checks TypeScript/JavaScript; Stylelint checks CSS against `stylelint-config-standard`; Oxfmt formats source, tests, configuration, and this README. `pnpm lint` runs both linters, and `pnpm format:check` checks formatting without writing. Generated `src/routeTree.gen.ts`, lockfile metadata, and the reference `CHATS.md` are excluded from formatting.

`pnpm install` runs the Husky `prepare` script in a Git checkout. The pre-commit hook runs lint-staged: Oxfmt formats staged supported files, Oxlint checks staged TS/JS files, and Stylelint checks staged CSS. The workspace only permits native install scripts for `better-sqlite3` and `esbuild`.

`.oxlintrc.json` adds production limits: cyclomatic complexity 12, 90 nonblank/noncomment lines per function, one class per file, block depth 3, three parameters, and 18 statements per function. Tests keep the same complexity/depth/parameter/class limits but allow 180 lines and 80 statements for linear browser journeys. Avoid splitting a coherent scenario solely to meet production function-size limits. The normal `pnpm lint` command and staged-file Oxlint hook both load this config.

## Decisions

`src/decisions/` owns defaults, the validated rule/experiment registry, assignment bucketing and provenance. `arrival-flow` changes hero, search and destination card layouts together; `destination-density` changes both grids. The India seasonal-offers rule needs both `country=IN` and `offers=on`. The inspector can force `control` or `treatment`, or leave each experiment on `auto`; URL controls preserve the destination filter while navigating. Invalid URL overrides are ignored and listed; an unknown destination shows a clear action. The home catalog renders six alphabetized destinations and three selected stays; the full index renders seven.

The server resolves values and assignments in loaders before HTML rendering. An HTTP-only visitor UUID cookie keeps `auto` assignments stable across requests when cookies are accepted; without cookies an assignment is request-scoped, though each response still hydrates consistently. FNV-1a over UTF-16 code units assigns <50 buckets to control. The app sets `Cache-Control: private, no-store` on personalized pages. The inspector is a local demonstration, not remote feature management, analytics or exposure tracking.

Page routes pass loader-resolved decisions into a route-scoped Zustand `DecisionProvider`; sections read only the paths they render with `useDecision(path)`. The store is constructed per loader snapshot, not as a module-global singleton, so server requests cannot share a visitor's decisions and navigation replaces the snapshot. Search and overrides remain owned by TanStack Router's URL (read via `usePageSearch`), not copied into Zustand; links and forms preserve them. The inspector still receives assignments and provenance directly from the loader.

The inspector is a bottom-right launcher, not an in-flow page section. Open it to filter experiments by ID; each row shows the assigned variant alongside its override. Visitor/flag controls are grouped separately, while resolved values and provenance are collapsed until requested. The panel stays inside the viewport and scrolls independently on small screens. Escape or Close returns focus to the launcher. Closing the inspector does not clear URL overrides; invalid values appear as a launcher count and in the panel.

## Cross-section extension: planning cues

Use `?guide=on&exp.planning-guide-detail=control` for brief planning cues in the hero, six destination cards, three featured stays, and destination index. Switch `exp.planning-guide-detail=treatment` for more explicit next-step copy on both routes and both card layouts. `guide=off` (the default) hides every cue even when the experiment is treatment. The rule `planning-guide-flag` owns `planningGuide.visible`; the experiment `planning-guide-detail` owns `planningGuide.detail`. Their provenance appears independently in the inspector. Invalid `guide` or experiment values are listed and ignored.

The new UI is one `PlanningPrompt` component reused by existing sections; no JSX checks experiment IDs. Adding a **new decision path** is intentionally not additions-only: the typed defaults, registry patch validation, provenance initialization, URL boundary, and server context must change together to retain exhaustive checks and reject unsafe input. Render sites and CSS are additive, while the shared search/inspector plumbing preserves overrides across links and forms.
