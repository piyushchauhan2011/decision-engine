# Compose a page with JSX

Page order and props are ordinary React JSX, not a block configuration or a remote layout schema. The rule/experiment engine resolves decision values on the server before rendering; components read values rather than experiment IDs.

Home (`src/pages/home/HomePage.tsx`) renders named sections directly:

```tsx
const offersVisible = useDecision("offers.visible");

return (
  <main>
    <Hero destinations={catalog.destinations} />
    <HomeDestinations destinations={catalog.destinations} />
    <FeaturedStays hotels={catalog.hotels} destinations={catalog.destinations} />
    {offersVisible && <SeasonalOffers />}
  </main>
);
```

The false gate omits offers even from server HTML. Layout decisions such as `hero.layout` or `destinationCard.layout` are read inside the relevant section/component. `PageRuntime` provides the per-route `DecisionProvider` and renders the inspector alongside the page.

## Add a page

1. Create a TanStack Start file route, e.g. `src/routes/journeys.tsx`. Use `validatePageSearch` and `loaderDeps: ({ search }) => inspectorSearch(search)` (include any page-specific query keys it reads). In its loader, fetch real catalog data with a server function and `getPageDecisions({ data: deps })`. The destination route shows how to validate an additional slug and display an empty state.
2. In the route component, read `Route.useLoaderData()` and `Route.useSearch()`, then render named sections inside `<PageRuntime decisions={decisions} search={search}><main>...</main></PageRuntime>`. Add a navigation link if the new route should be discoverable.
3. Reuse existing section components where appropriate. For new data, update the Drizzle schema/migration/seed and the relevant server-side query; do not load SQLite in the component. See [Feature workflow](feature-workflow.md).

The route still declares its data dependencies: this is intentional. A generic page loader cannot know whether a page needs six destinations, an exact slug, or featured hotels. Start still owns SSR, hydration, routing and link validation.

## Add a section

Implement a named component in `src/pages/home/sections.tsx`, `src/pages/destinations/sections.tsx`, or another `src/pages/` file. Give it explicit typed props and render it in page JSX. For an eligibility rule, register a boolean visibility decision and conditionally render the section based on `useDecision`; for A/B presentation, have the experiment own a **different** layout/detail path that the section reads via `useDecision`. Ownership, defaults, provenance, URL controls and validation remain explicit in `src/decisions/` and `src/page.functions.ts`—composition does not replace these contracts.

This is code-first composition: pages stay reviewable JSX, while catalog data remains separate from page structure. A new route or data shape still takes code.
