import { Link } from "@tanstack/react-router";
import type { Destination, Hotel } from "../../db/catalog.server";
import { useDecision } from "../../decisions/DecisionStore";
import { inspectorSearch, inspectorOverrides, usePageSearch } from "../../search";
import { DestinationGrid } from "../destinations/cards";
import { PlanningPrompt } from "../PlanningPrompt";
import { imageUrl } from "../image";

function DestinationSearch({ destinations }: { destinations: Destination[] }) {
  const search = usePageSearch();
  return (
    <form className="destination-search" action="/destinations" method="get">
      <label htmlFor="destination-select">Find your next place</label>
      <div className="search-row">
        <select id="destination-select" name="destination" defaultValue="" required>
          <option value="" disabled>
            Choose a destination
          </option>
          {destinations.map((destination) => (
            <option key={destination.id} value={destination.slug}>
              {destination.name}, {destination.country}
            </option>
          ))}
        </select>
        <button type="submit">
          Explore stays <span aria-hidden="true">↗</span>
        </button>
      </div>
      {Object.entries(inspectorOverrides(search)).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
    </form>
  );
}

export function Hero({ destinations }: { destinations: Destination[] }) {
  const heroLayout = useDecision("hero.layout");
  const searchLayout = useDecision("search.layout");
  return (
    <section
      className={`hero hero-${heroLayout} search-${searchLayout}`}
      data-hero-layout={heroLayout}
      data-search-layout={searchLayout}
    >
      <div className="hero-visual" role="presentation" />
      <div className="container hero-content">
        <p className="eyebrow">STAYS WITH A SENSE OF PLACE</p>
        <h1>
          Go somewhere
          <br />
          <em>worth remembering.</em>
        </h1>
        <p>Independent hotels and slower journeys, selected with care.</p>
        <PlanningPrompt
          brief="Plan at your own pace."
          expanded="Choose a destination to narrow the collection before exploring."
        />
        {searchLayout === "inline" && <DestinationSearch destinations={destinations} />}
      </div>
      {searchLayout === "overlay" && (
        <div className="container hero-search">
          <DestinationSearch destinations={destinations} />
        </div>
      )}
    </section>
  );
}

export function FeaturedStays({
  hotels,
  destinations,
}: {
  hotels: Hotel[];
  destinations: Destination[];
}) {
  const search = usePageSearch();
  return (
    <section className="section featured">
      <div className="container">
        <div className="section-heading">
          <div>
            <p className="eyebrow">REMARKABLE STAYS</p>
            <h2>Hotels we keep thinking about</h2>
          </div>
          <Link to="/destinations" search={inspectorSearch(search)}>
            Explore destinations →
          </Link>
        </div>
        <div className="hotel-grid">
          {hotels.map((hotel) => (
            <article className="hotel-card" key={hotel.id}>
              <Link
                to="/destinations"
                search={{
                  ...inspectorSearch(search),
                  destination: destinations.find(
                    (destination) => destination.id === hotel.destinationId,
                  )?.slug,
                }}
              >
                <div className="hotel-image">
                  <img
                    src={imageUrl(hotel.image, 800)}
                    srcSet={`${imageUrl(hotel.image, 480)} 480w, ${imageUrl(hotel.image, 800)} 800w, ${imageUrl(hotel.image, 1280)} 1280w`}
                    sizes="(max-width: 650px) calc(100vw - 32px), (max-width: 900px) calc((100vw - 72px) / 2), (max-width: 1228px) calc((100vw - 96px) / 3), 377px"
                    alt=""
                    width="1280"
                    height="800"
                    loading="lazy"
                    fetchPriority="low"
                    decoding="async"
                  />
                  <span className="hotel-rating">★ {(hotel.rating / 10).toFixed(1)}</span>
                </div>
                <div className="hotel-copy">
                  <p className="eyebrow">INDEPENDENT STAY</p>
                  <h3>{hotel.name}</h3>
                  <p>{hotel.summary}</p>
                  <PlanningPrompt
                    brief="Explore this destination."
                    expanded="Open this stay's destination to focus on one place."
                  />
                  <div className="hotel-footer">
                    <span>
                      From <strong>${hotel.priceFrom}</strong> / night
                    </span>
                    <span aria-hidden="true">↗</span>
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SeasonalOffers() {
  return (
    <section className="section offers">
      <div className="container offers-inner">
        <p className="eyebrow">SPECIAL OFFERS</p>
        <h2>
          More time.
          <br />
          <em>More to remember.</em>
        </h2>
        <p>Seasonal invitations designed to make a good stay linger a little longer.</p>
      </div>
    </section>
  );
}

export function HomeDestinations({ destinations }: { destinations: Destination[] }) {
  const search = usePageSearch();
  return (
    <section className="section places">
      <div className="container">
        <div className="section-heading">
          <div>
            <p className="eyebrow">CURATED PLACES</p>
            <h2>Where will you go next?</h2>
          </div>
          <Link to="/destinations" search={inspectorSearch(search)}>
            All destinations →
          </Link>
        </div>
        <DestinationGrid destinations={destinations} />
      </div>
    </section>
  );
}
