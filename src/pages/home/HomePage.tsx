import type { Destination, Hotel } from "../../db/catalog.server";
import { useDecision } from "../../decisions/DecisionStore";
import { FeaturedStays, Hero, HomeDestinations, SeasonalOffers } from "./sections";

export function HomePage({
  catalog,
}: {
  catalog: { destinations: Destination[]; hotels: Hotel[] };
}) {
  const offersVisible = useDecision("offers.visible");

  return (
    <main>
      <Hero destinations={catalog.destinations} />
      <HomeDestinations destinations={catalog.destinations} />
      <FeaturedStays hotels={catalog.hotels} destinations={catalog.destinations} />
      {offersVisible && <SeasonalOffers />}
    </main>
  );
}
