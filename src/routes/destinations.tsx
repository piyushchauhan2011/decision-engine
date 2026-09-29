import { createFileRoute } from "@tanstack/react-router";
import { getDestinations } from "../catalog.functions";
import { getPageDecisions } from "../page.functions";
import { PageRuntime } from "../pages/PageRuntime";
import { DestinationIntro, DestinationResults } from "../pages/destinations/sections";
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
    <PageRuntime decisions={decisions} search={search}>
      <main className="container destination-page">
        <DestinationIntro />
        <DestinationResults items={items} />
      </main>
    </PageRuntime>
  );
}
