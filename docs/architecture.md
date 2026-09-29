# Architecture

TanStack Start owns both SSR and client navigation for `/` and `/destinations`; there is no parallel client-only router. The root route (`src/routes/__root.tsx`) supplies the document, header/footer, not-found view, and `Cache-Control: private, no-store` because HTML depends on a visitor cookie and URL overrides.

```text
URL search + visitor cookie
  → route validateSearch / loaderDeps
  → Start server functions (catalog + page decisions)
  → Drizzle SQLite catalog + pure decision resolver
  → route loader data → DecisionProvider + JSX sections + inspector
  → SSR HTML → hydrate with the same loader-resolved values
```

- `src/search.ts` keeps recognized search strings (including invalid overrides so the inspector can report them). `loaderDeps` on each route includes the fields that affect its content: inspector overrides on both pages, plus `destination` on the index. This makes changing controls reload the relevant data and decisions.
- `src/catalog.functions.ts` validates destination slugs before querying `src/db/catalog.server.ts`. Only the server module opens `better-sqlite3`; the Drizzle schema lives in `src/db/schema.ts`, migrations in `drizzle/`, and reproducible seed data in `scripts/seed-data.ts`. Catalog functions return primitives to routes, turning catalog `Result` errors into route errors. A missing slug match yields an empty list, not a database error.
- `src/page.functions.ts` validates overrides again at the server-function boundary, establishes an HTTP-only UUID `visitorId` cookie, computes experiment assignments, evaluates rules, and returns `{ values, provenance, assignments, ignored }`. Defaults are US and flags off. If cookies are blocked, assignments may change between requests, but each response is rendered and hydrated from its own resolved snapshot.
- `src/routes/index.tsx` and `src/routes/destinations.tsx` load catalog and decisions in parallel. They pass the values to a route-scoped Zustand `DecisionProvider` (`src/decisions/DecisionStore.tsx`); components subscribe to individual paths with `useDecision(path)`. No module-global visitor state; URL search stays in TanStack Router, not in Zustand. The inspector gets assignments/provenance directly from loader data.
- `src/pages/home/HomePage.tsx` composes the hero/search, destinations, stays, and conditional offers. `src/pages/destinations/cards.tsx` shares destination cards and grid between pages; `src/pages/PlanningPrompt.tsx` shares optional planning cues. Links and the native destination form preserve inspector overrides.

The decision engine is independent of React, routing, and SQLite; see [Decision engine](decision-engine.md). UI variants are selected by decision values, not experiment IDs; see [Registry over conditionals](registry-pattern.md).
