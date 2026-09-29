import { createFileRoute } from "@tanstack/react-router";
import { getHomeCatalog } from "../catalog.functions";
import { DecisionProvider } from "../decisions/DecisionStore";
import { Inspector } from "../inspector/Inspector";
import { getPageDecisions } from "../page.functions";
import { HomePage } from "../pages/home/HomePage";
import { inspectorSearch, validatePageSearch } from "../search";

export const Route = createFileRoute("/")({
  validateSearch: validatePageSearch,
  loaderDeps: ({ search }) => inspectorSearch(search),
  loader: async ({ deps }) => {
    const [catalog, decisions] = await Promise.all([
      getHomeCatalog(),
      getPageDecisions({ data: deps }),
    ]);
    return { catalog, decisions };
  },
  component: HomeRoute,
});

function HomeRoute() {
  const { catalog, decisions } = Route.useLoaderData();
  const search = Route.useSearch();
  return (
    <>
      <DecisionProvider values={decisions.values}>
        <HomePage catalog={catalog} />
      </DecisionProvider>
      <Inspector result={decisions} search={search} />
    </>
  );
}
