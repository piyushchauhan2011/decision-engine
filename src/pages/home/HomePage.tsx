import { Link } from "@tanstack/react-router";
import type { Destination, Hotel } from "../../db/catalog.server";
import type { DecisionValues } from "../../decisions";
import { inspectorSearch, inspectorOverrides, type PageSearch } from "../../search";
import { DestinationGrid } from "../destinations/cards";
import { PlanningPrompt } from "../PlanningPrompt";

type HomeProps = {
  catalog: { destinations: Destination[]; hotels: Hotel[] };
  values: DecisionValues;
  search: PageSearch;
};

function DestinationSearch({
  destinations,
  search,
}: {
  destinations: Destination[];
  search: PageSearch;
}) {
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

function Hero({ catalog, values, search }: HomeProps) {
  return (
    <section
      className={`hero hero-${values["hero.layout"]} search-${values["search.layout"]}`}
      data-hero-layout={values["hero.layout"]}
      data-search-layout={values["search.layout"]}
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
          values={values}
          brief="Plan at your own pace."
          expanded="Choose a destination to narrow the collection before exploring."
        />
        {values["search.layout"] === "inline" && (
          <DestinationSearch destinations={catalog.destinations} search={search} />
        )}
      </div>
      {values["search.layout"] === "overlay" && (
        <div className="container hero-search">
          <DestinationSearch destinations={catalog.destinations} search={search} />
        </div>
      )}
    </section>
  );
}

function FeaturedStays({
  hotels,
  destinations,
  search,
  values,
}: {
  hotels: Hotel[];
  destinations: Destination[];
  search: PageSearch;
  values: DecisionValues;
}) {
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
                  <img src={hotel.image} alt="" width="560" height="380" loading="lazy" />
                  <span className="hotel-rating">★ {(hotel.rating / 10).toFixed(1)}</span>
                </div>
                <div className="hotel-copy">
                  <p className="eyebrow">INDEPENDENT STAY</p>
                  <h3>{hotel.name}</h3>
                  <p>{hotel.summary}</p>
                  <PlanningPrompt
                    values={values}
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

function SeasonalOffers() {
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

export function HomePage({ catalog, values, search }: HomeProps) {
  return (
    <main>
      <Hero catalog={catalog} values={values} search={search} />
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
          <DestinationGrid
            destinations={catalog.destinations}
            layout={values["destinationCard.layout"]}
            columns={values["destinations.columns"]}
            values={values}
            search={inspectorSearch(search)}
          />
        </div>
      </section>
      <FeaturedStays
        hotels={catalog.hotels}
        destinations={catalog.destinations}
        search={search}
        values={values}
      />
      {values["offers.visible"] && <SeasonalOffers />}
    </main>
  );
}
