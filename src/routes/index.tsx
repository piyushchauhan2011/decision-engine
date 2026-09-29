import { createFileRoute } from "@tanstack/react-router";
import { getHomeCatalog } from "../catalog.functions";
import { getPageDecisions } from "../page.functions";
import { PageRuntime } from "../pages/PageRuntime";
import { HomePage } from "../pages/home/HomePage";
import { inspectorSearch, validatePageSearch } from "../search";

export const Route = createFileRoute("/")({
  head: () => ({
    links: [{ rel: "preload", as: "image", href: "/images/hero-1280.webp", fetchPriority: "high" }],
  }),
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
    <PageRuntime decisions={decisions} search={search}>
      <HomePage catalog={catalog} />
    </PageRuntime>
  );
}
