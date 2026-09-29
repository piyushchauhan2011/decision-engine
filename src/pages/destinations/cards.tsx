import { Link } from "@tanstack/react-router";
import type { ComponentType } from "react";
import type { Destination } from "../../db/catalog.server";
import { useDecision } from "../../decisions/DecisionStore";
import type { DecisionValues } from "../../decisions";
import { inspectorSearch, usePageSearch, type InspectorSearch } from "../../search";
import { PlanningPrompt } from "../PlanningPrompt";

type CardProps = { destination: Destination; search: InspectorSearch };
type CardLayout = DecisionValues["destinationCard.layout"];

function ImageCard({ destination, search }: CardProps) {
  return (
    <article className="destination-card image-card">
      <Link to="/destinations" search={{ ...search, destination: destination.slug }}>
        <img
          src={destination.image}
          alt=""
          width="1280"
          height="720"
          loading="lazy"
          decoding="async"
        />
        <div className="card-copy">
          <span className="eyebrow">{destination.country}</span>
          <h3>{destination.name}</h3>
          <p>{destination.summary}</p>
          <b>Explore place ↗</b>
          <PlanningPrompt
            brief={`Focus on ${destination.name}.`}
            expanded={`Select ${destination.name} to filter the collection to one place.`}
          />
        </div>
      </Link>
    </article>
  );
}

function CompactCard({ destination, search }: CardProps) {
  return (
    <article className="destination-card compact-card">
      <Link to="/destinations" search={{ ...search, destination: destination.slug }}>
        <span className="eyebrow">{destination.country}</span>
        <h3>
          {destination.name} <span aria-hidden="true">↗</span>
        </h3>
        <p>{destination.summary}</p>
        <PlanningPrompt
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

export function DestinationGrid({ destinations }: { destinations: Destination[] }) {
  const layout = useDecision("destinationCard.layout");
  const columns = useDecision("destinations.columns");
  const search = inspectorSearch(usePageSearch());
  const Card = cardRegistry[layout];
  if (!Card) throw new Error(`Unknown destination card layout: ${layout}`);
  return (
    <div
      className={`destination-grid columns-${columns}`}
      data-card-layout={layout}
      data-columns={columns}
    >
      {destinations.map((destination) => (
        <Card key={destination.id} destination={destination} search={search} />
      ))}
    </div>
  );
}
