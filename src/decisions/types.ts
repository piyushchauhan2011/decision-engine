export interface DecisionValues {
  "hero.layout": "immersive" | "split";
  "search.layout": "overlay" | "inline";
  "destinationCard.layout": "image" | "compact";
  "destinations.columns": "three" | "two";
  "offers.visible": boolean;
  "planningGuide.visible": boolean;
  "planningGuide.detail": "brief" | "expanded";
}

export type DecisionPath = keyof DecisionValues;
export type DecisionPage = "home" | "destinations";

export const decisionPagePaths: Record<DecisionPage, readonly DecisionPath[]> = {
  home: [
    "hero.layout",
    "search.layout",
    "destinationCard.layout",
    "destinations.columns",
    "offers.visible",
    "planningGuide.visible",
    "planningGuide.detail",
  ],
  destinations: [
    "destinationCard.layout",
    "destinations.columns",
    "planningGuide.visible",
    "planningGuide.detail",
  ],
};

export const decisionDefaults: Readonly<DecisionValues> = {
  "hero.layout": "immersive",
  "search.layout": "overlay",
  "destinationCard.layout": "image",
  "destinations.columns": "three",
  "offers.visible": false,
  "planningGuide.visible": false,
  "planningGuide.detail": "brief",
};

export interface RuleContext {
  visitor: { country: "IN" | "US" };
  flags: { "seasonal-offers": boolean; "planning-guide": boolean };
}

export type DecisionProvenance =
  | { source: "default" }
  | { source: "rule"; id: string }
  | { source: "experiment"; id: string; variant: "control" | "treatment" };

export type Variant = "control" | "treatment";

export interface DecisionResult {
  values: DecisionValues;
  provenance: Record<DecisionPath, DecisionProvenance>;
  assignments: Record<string, Variant>;
}
