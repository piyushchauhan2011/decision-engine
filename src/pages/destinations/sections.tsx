import { Link } from "@tanstack/react-router";
import type { Destination } from "../../db/catalog.server";
import { inspectorSearch, usePageSearch } from "../../search";
import { PlanningPrompt } from "../PlanningPrompt";
import { DestinationGrid } from "./cards";

export function DestinationIntro() {
  return (
    <header className="destination-intro">
      <p className="eyebrow">FIELD GUIDES</p>
      <h1>
        Places worth
        <br />
        <em>knowing slowly.</em>
      </h1>
      <p>Independent stays, local rituals, and considered notes for a more rewarding arrival.</p>
      <PlanningPrompt
        brief="Choose one place to focus."
        expanded="Select a card to narrow the collection to one destination."
      />
    </header>
  );
}

export function DestinationResults({ items }: { items: Destination[] }) {
  const search = usePageSearch();
  return items.length > 0 ? (
    <DestinationGrid destinations={items} />
  ) : (
    <div className="empty-state">
      <h2>No destination found</h2>
      <p>That destination is not in our collection. Browse all seven places instead.</p>
      <Link to="/destinations" search={inspectorSearch(search)}>
        Clear destination filter →
      </Link>
    </div>
  );
}
