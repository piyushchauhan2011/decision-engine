import { createFileRoute, Link } from "@tanstack/react-router";
import { getDestinations } from "../catalog.functions";
import { Inspector } from "../inspector/Inspector";
import { getPageDecisions } from "../page.functions";
import { DestinationGrid } from "../pages/destinations/cards";
import { PlanningPrompt } from "../pages/PlanningPrompt";
import { inspectorSearch, validatePageSearch } from "../search";

export const Route = createFileRoute("/destinations")({
  validateSearch: validatePageSearch,
  loaderDeps: ({ search }) => ({ ...inspectorSearch(search), destination: search.destination }),
  loader: async ({ deps }) => {
    const destination =
      deps.destination && /^[a-z0-9-]{1,80}$/.test(deps.destination) ? deps.destination : undefined;
    const [items, decisions] = await Promise.all([
      deps.destination && !destination
        ? Promise.resolve([])
        : getDestinations({ data: { destination } }),
      getPageDecisions({ data: inspectorSearch(deps) }),
    ]);
    return { items, decisions };
  },
  component: DestinationsRoute,
});

function DestinationsRoute() {
  const { items, decisions } = Route.useLoaderData();
  const search = Route.useSearch();
  return (
    <>
      <main className="container destination-page">
        <header className="destination-intro">
          <p className="eyebrow">FIELD GUIDES</p>
          <h1>
            Places worth
            <br />
            <em>knowing slowly.</em>
          </h1>
          <p>
            Independent stays, local rituals, and considered notes for a more rewarding arrival.
          </p>
          <PlanningPrompt
            values={decisions.values}
            brief="Choose one place to focus."
            expanded="Select a card to narrow the collection to one destination."
          />
        </header>
        {items.length > 0 ? (
          <DestinationGrid
            destinations={items}
            layout={decisions.values["destinationCard.layout"]}
            columns={decisions.values["destinations.columns"]}
            values={decisions.values}
            search={inspectorSearch(search)}
          />
        ) : (
          <div className="empty-state">
            <h2>No destination found</h2>
            <p>That destination is not in our collection. Browse all seven places instead.</p>
            <Link to="/destinations" search={inspectorSearch(search)}>
              Clear destination filter →
            </Link>
          </div>
        )}
      </main>
      <Inspector result={decisions} search={search} />
    </>
  );
}
