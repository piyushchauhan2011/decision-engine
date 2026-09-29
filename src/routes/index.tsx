import { createFileRoute } from "@tanstack/react-router";
import { getHomeCatalog } from "../catalog.functions";
import { getPageDecisions } from "../page.functions";
import { PageRuntime } from "../pages/PageRuntime";
import { HomePage } from "../pages/home/HomePage";
import { inspectorSearch, validatePageSearch } from "../search";

export const Route = createFileRoute("/")({
  head: () => ({
    links: [
      {
        rel: "preload",
        as: "image",
        href: "/image/1280/hero-1280.webp",
        media: "(min-width: 651px)",
        fetchPriority: "high",
      },
      {
        rel: "preload",
        as: "image",
        href: "/image/800/hero-1280.webp",
        media: "(max-width: 650px)",
        fetchPriority: "high",
      },
    ],
  }),
  validateSearch: validatePageSearch,
  loaderDeps: ({ search }) => inspectorSearch(search),
  loader: async ({ deps }) => {
    const [catalog, decisions] = await Promise.all([
      getHomeCatalog(),
      getPageDecisions({ data: { page: "home", ...deps } }),
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
