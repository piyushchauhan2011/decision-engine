# Architecture

TanStack Start owns both SSR and client navigation for `/` and `/destinations`; there is no parallel client-only router. The root route (`src/routes/__root.tsx`) supplies the document, header/footer, not-found view, and `Cache-Control: private, no-cache`: personalized HTML may remain in the browser's private cache and back/forward cache, but ordinary HTTP reuse must revalidate and shared caches must not store it.

```text
URL search + visitor cookie
  → route validateSearch / loaderDeps
  → Start server functions (catalog + page decisions)
  → Drizzle SQLite catalog + pure decision resolver
  → route loader data → DecisionProvider + JSX sections + inspector
  → SSR HTML → hydrate with the same loader-resolved values
```

- `src/search.ts` retains string-valued recognized URL keys via Zod in development (including malformed preview strings for inspector diagnostics); production retains only destination filtering. `loaderDeps` includes inspector overrides in development plus `destination` on the index.
- `src/catalog.functions.ts` validates destination slugs before querying `src/db/catalog.server.ts`. Only the server module opens `better-sqlite3`; the Drizzle schema lives in `src/db/schema.ts`, migrations in `drizzle/`, and reproducible seed data in `scripts/seed-data.ts`. Catalog functions return primitives to routes, turning catalog `Result` errors into route errors. A missing slug match yields an empty list, not a database error.
- `src/page.functions.ts` validates page and known override strings at the server boundary and establishes an HTTP-only UUID `visitorId` cookie, HMAC-signed in production. `src/decisions/request.server.ts` uses the page-indexed allocator and resolver to return `{ values, provenance, assignments, ignored }`; production ignores public controls and uses trusted flags and US country. Each response is rendered and hydrated from its own resolved snapshot.
- `src/routes/index.tsx` and `src/routes/destinations.tsx` load catalog and page-specific decisions in parallel. `src/pages/PageRuntime.tsx` passes full values to the route-scoped Zustand `DecisionProvider` (`src/decisions/DecisionStore.tsx`) and renders the inspector only in development. Components subscribe to individual paths with `useDecision(path)`.
- `HomePage.tsx` and `src/routes/destinations.tsx` compose named React sections directly in JSX. Home reads `offers.visible` to omit the offers section when false, including in server HTML. `src/pages/destinations/cards.tsx` shares destination cards/grid, and `src/pages/PlanningPrompt.tsx` shares optional cues. Links and the native destination form preserve inspector overrides only in development. See [Page composition](page-composition.md).
- `src/routes/image.$.ts` processes local catalog WebP sources with UnJS IPX at three bounded widths; `src/pages/image.ts` builds responsive `srcSet` URLs for destination and hotel cards. Hero CSS and preload use the same image route. Sources are restricted to `public/images`, and URL widths/filenames are validated before IPX runs.

The decision engine is independent of React, routing, and SQLite; see [Decision engine](decision-engine.md). UI variants are selected by decision values, not experiment IDs; see [Registry over conditionals](registry-pattern.md).
