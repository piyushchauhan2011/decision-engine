import { assignPageExperiments } from "./allocate";
import { resolveDecisions } from "./resolve";
import type { DecisionPage, DecisionResult, RuleContext } from "./types";

interface DecisionRequest {
  page: DecisionPage;
  search: Readonly<Record<string, string | undefined>>;
  visitorId: string;
  production: boolean;
  rollout: { disabledIds: ReadonlySet<string>; seasonalOffers: boolean; planningGuide: boolean };
}

// Trust boundary: each public field is deliberately normalized or discarded.
// eslint-disable-next-line complexity
export function resolveDecisionRequest({
  page,
  search,
  visitorId,
  production,
  rollout,
}: DecisionRequest): DecisionResult & { ignored: Record<string, string> } {
  const ignored: Record<string, string> = Object.create(null);
  let country: "US" | "IN" = "US";
  let offers = rollout.seasonalOffers;
  let guide = rollout.planningGuide;
  const overrides: Record<string, string> = Object.create(null);
  if (!production) {
    if (search.country === "IN" || search.country === "US") country = search.country;
    else if (search.country !== undefined) ignored.country = search.country;
    for (const [key, value] of [
      ["offers", search.offers],
      ["guide", search.guide],
    ] as const) {
      if (value !== undefined && value !== "on" && value !== "off") ignored[key] = value;
    }
    offers = search.offers === "on";
    guide = search.guide === "on";
    for (const [key, value] of Object.entries(search)) {
      if (key.startsWith("exp.") && value !== undefined) overrides[key] = value;
    }
  }
  const context: RuleContext = {
    visitor: { country },
    flags: { "seasonal-offers": offers, "planning-guide": guide },
  };
  const allocation = assignPageExperiments({
    page,
    visitorId,
    context,
    disabledIds: rollout.disabledIds,
    overrides: production ? undefined : overrides,
  });
  return {
    ...resolveDecisions({ page, context, assignments: allocation.assignments }),
    ignored: { ...ignored, ...allocation.ignored },
  };
}
