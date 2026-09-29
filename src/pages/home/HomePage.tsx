import type { Destination, Hotel } from "../../db/catalog.server";
import { PageZone, type PageBlock } from "../blocks";

export function HomePage({
  catalog,
}: {
  catalog: { destinations: Destination[]; hotels: Hotel[] };
}) {
  const blocks = [
    { id: "hero", type: "hero", props: { destinations: catalog.destinations } },
    { id: "places", type: "destinations", props: { destinations: catalog.destinations } },
    { id: "stays", type: "stays", props: catalog },
    { id: "offers", type: "offers", props: {}, when: "offers.visible" },
  ] as const satisfies readonly PageBlock[];

  return <PageZone blocks={blocks} />;
}
