import type { ComponentProps, ComponentType } from "react";
import type { DecisionValues } from "../decisions";
import { useDecision } from "../decisions/DecisionStore";
import { DestinationIntro, DestinationResults } from "./destinations/sections";
import { FeaturedStays, Hero, HomeDestinations, SeasonalOffers } from "./home/sections";

const blockRegistry = {
  hero: Hero,
  destinations: HomeDestinations,
  stays: FeaturedStays,
  offers: SeasonalOffers,
  destinationIntro: DestinationIntro,
  destinationResults: DestinationResults,
} as const;

type BooleanPath = {
  [K in keyof DecisionValues]: DecisionValues[K] extends boolean ? K : never;
}[keyof DecisionValues];

type BlockProps<K extends keyof typeof blockRegistry> =
  ComponentProps<(typeof blockRegistry)[K]> extends object
    ? ComponentProps<(typeof blockRegistry)[K]>
    : Record<string, never>;

export type PageBlock = {
  [K in keyof typeof blockRegistry]: {
    id: string;
    type: K;
    props: BlockProps<K>;
    when?: BooleanPath;
  };
}[keyof typeof blockRegistry];

function DecisionGate({ path, children }: { path: BooleanPath; children: React.ReactNode }) {
  return useDecision(path) ? children : null;
}

function Block({ block }: { block: PageBlock }) {
  // The discriminated union above ties each type to this registry entry's props.
  const Component = blockRegistry[block.type] as ComponentType<PageBlock["props"]>;
  const content = <Component {...block.props} />;
  return block.when ? <DecisionGate path={block.when}>{content}</DecisionGate> : content;
}

export function PageZone({
  blocks,
  className,
}: {
  blocks: readonly PageBlock[];
  className?: string;
}) {
  return (
    <main className={className}>
      {blocks.map((block) => (
        <Block key={block.id} block={block} />
      ))}
    </main>
  );
}
