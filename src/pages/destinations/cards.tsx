import { Link } from "@tanstack/react-router";
import type { ComponentType } from "react";
import type { Destination } from "../../db/catalog.server";
import type { DecisionValues } from "../../decisions";
import type { InspectorSearch } from "../../search";
import { PlanningPrompt } from "../PlanningPrompt";

type CardProps = { destination: Destination; search: InspectorSearch; values: DecisionValues };
type CardLayout = DecisionValues["destinationCard.layout"];

function ImageCard({ destination, search, values }: CardProps) {
  return (
    <article className="destination-card image-card">
      <Link to="/destinations" search={{ ...search, destination: destination.slug }}>
        <img src={destination.image} alt="" width="560" height="440" loading="lazy" />
        <div className="card-copy">
          <span className="eyebrow">{destination.country}</span>
          <h3>{destination.name}</h3>
          <p>{destination.summary}</p>
          <b>Explore place ↗</b>
          <PlanningPrompt
            values={values}
            brief={`Focus on ${destination.name}.`}
            expanded={`Select ${destination.name} to filter the collection to one place.`}
          />
        </div>
      </Link>
    </article>
  );
}

function CompactCard({ destination, search, values }: CardProps) {
  return (
    <article className="destination-card compact-card">
      <Link to="/destinations" search={{ ...search, destination: destination.slug }}>
        <span className="eyebrow">{destination.country}</span>
        <h3>
          {destination.name} <span aria-hidden="true">↗</span>
        </h3>
        <p>{destination.summary}</p>
        <PlanningPrompt
          values={values}
          brief={`Focus on ${destination.name}.`}
          expanded={`Select ${destination.name} to filter the collection to one place.`}
        />
      </Link>
    </article>
  );
}

const cardRegistry: Record<CardLayout, ComponentType<CardProps>> = {
  image: ImageCard,
  compact: CompactCard,
};

export function DestinationGrid({
  destinations,
  layout,
  columns,
  search,
  values,
}: {
  destinations: Destination[];
  layout: CardLayout;
  columns: DecisionValues["destinations.columns"];
  search: InspectorSearch;
  values: DecisionValues;
}) {
  const Card = cardRegistry[layout];
  if (!Card) throw new Error(`Unknown destination card layout: ${layout}`);
  return (
    <div
      className={`destination-grid columns-${columns}`}
      data-card-layout={layout}
      data-columns={columns}
    >
      {destinations.map((destination) => (
        <Card key={destination.id} destination={destination} search={search} values={values} />
      ))}
    </div>
  );
}
