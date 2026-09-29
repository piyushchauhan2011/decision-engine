# Compose a page from blocks

Page layout is a small TypeScript array, not an admin-managed document or YAML. Each entry selects a registered React block, provides its typed catalog data, and optionally names a **resolved boolean decision path** for visibility. The array order is the rendered order. The rule/experiment engine still resolves values on the server before rendering; blocks never inspect experiment IDs.

Home (`src/pages/home/HomePage.tsx`) currently reads like this:

```tsx
const blocks = [
  { id: "hero", type: "hero", props: { destinations: catalog.destinations } },
  { id: "places", type: "destinations", props: { destinations: catalog.destinations } },
  { id: "stays", type: "stays", props: catalog },
  { id: "offers", type: "offers", props: {}, when: "offers.visible" },
] as const satisfies readonly PageBlock[];

return <PageZone blocks={blocks} />;
```

`PageBlock` in `src/pages/blocks.tsx` derives each entry's required props from `blockRegistry`; TypeScript rejects unknown block names, missing props and non-boolean `when` paths. Each `id` is a stable React key; give repeated blocks different IDs. `PageZone` renders a `<main>` and wraps gated blocks in a decision gate. A false gate omits the block even from server HTML. Layout decisions such as `hero.layout` or `destinationCard.layout` are read inside the block/component; `when` is only for visibility. The inspector sits outside the zone in `PageRuntime`, which supplies a per-route `DecisionProvider` to the blocks.

## Add a page

1. Create a TanStack Start file route, e.g. `src/routes/journeys.tsx`. Use `validatePageSearch` and `loaderDeps: ({ search }) => inspectorSearch(search)` (include any page-specific query keys it reads). In its loader, fetch real catalog data with a server function and `getPageDecisions({ data: deps })`. The destination route shows how to validate an additional slug and display an empty state.
2. In the route component, read `Route.useLoaderData()` and `Route.useSearch()`, assemble a `readonly PageBlock[]` with `as const satisfies`, and render it inside `<PageRuntime decisions={decisions} search={search}><PageZone blocks={blocks} /></PageRuntime>`. Use `className` on `PageZone` for a page-specific `<main>` layout. Add a navigation link if the new route should be discoverable.
3. Use existing blocks first. For new data, update the Drizzle schema/migration/seed and the relevant server-side query; do not load SQLite in the component. See [Feature workflow](feature-workflow.md).

The route still declares its data dependencies: this is intentional. A generic page loader cannot know whether a page needs six destinations, an exact slug, or featured hotels. Start still owns SSR, hydration, routing and link validation.

## Add a block

Implement a named component in `src/pages/home/sections.tsx`, `src/pages/destinations/sections.tsx`, or another `src/pages/` file. Give it explicit typed props. Add it once to `blockRegistry` in `src/pages/blocks.tsx`, then use its `type` and `props` in page arrays. No switch statement or page-specific experiment check is needed. Existing blocks may be repeated or rearranged in another page. For an eligibility rule, register a boolean visibility decision (`when`) with its own owner; for A/B presentation, have the experiment own a **different** layout/detail path that the block reads via `useDecision`. Ownership, defaults, provenance, URL controls and validation remain explicit in `src/decisions/` and `src/page.functions.ts`—composition does not replace these contracts.

This is deliberately **code-first composition** rather than arbitrary remote layouts: typed blocks and JSX stay reviewable, while catalog data is separate from page structure. A new route or new data shape still takes code; adding a page with existing blocks does not require rebuilding their JSX or rule handling.
