import { describe, expect, it } from "vitest";
import {
  assignVariant,
  bucketForExperiment,
  createDecisionRegistry,
  evaluateRule,
  experiments,
  resolveDecisions,
  ruleEffects,
} from "../src/decisions";
import type { RuleContext } from "../src/decisions";

const india: RuleContext = { visitor: { country: "IN" }, flags: { "seasonal-offers": true } };
const us: RuleContext = { visitor: { country: "US" }, flags: { "seasonal-offers": true } };

describe("decisions", () => {
  it("evaluates nested rules and rejects unknown branches even when short-circuited", () => {
    expect(
      evaluateRule(
        {
          type: "all",
          rules: [
            { type: "flag", name: "seasonal-offers" },
            {
              type: "not",
              rule: { type: "any", rules: [{ type: "eq", field: "visitor.country", value: "US" }] },
            },
          ],
        },
        india,
      ),
    ).toBe(true);
    expect(() =>
      evaluateRule(
        {
          type: "any",
          rules: [
            { type: "flag", name: "seasonal-offers" },
            { type: "flag", name: "unknown" } as never,
          ],
        },
        india,
      ),
    ).toThrow(/Unknown rule flag/);
    expect(() => evaluateRule({ type: "eq", field: "visitor.region" } as never, india)).toThrow(
      /Unknown rule field/,
    );
  });

  it("buckets the same anonymous visitor consistently for each experiment", () => {
    expect(bucketForExperiment("fixed-id", "arrival-flow")).toBe(33);
    expect(assignVariant("fixed-id", "arrival-flow")).toBe("control");
    expect(assignVariant("fixed-id", "arrival-flow")).toBe(
      assignVariant("fixed-id", "arrival-flow"),
    );
  });

  it("applies cross-section treatment and attributes every path, with conditional rule", () => {
    const result = resolveDecisions({
      context: india,
      assignments: { "arrival-flow": "treatment", "destination-density": "treatment" },
    });
    expect(result.values).toEqual({
      "hero.layout": "split",
      "search.layout": "inline",
      "destinationCard.layout": "compact",
      "destinations.columns": "two",
      "offers.visible": true,
    });
    expect(result.provenance["search.layout"]).toEqual({
      source: "experiment",
      id: "arrival-flow",
      variant: "treatment",
    });
    expect(result.provenance["destinations.columns"]).toEqual({
      source: "experiment",
      id: "destination-density",
      variant: "treatment",
    });
    expect(result.provenance["offers.visible"]).toEqual({
      source: "rule",
      id: "india-seasonal-offers",
    });
    const nonmatch = resolveDecisions({ context: us, assignments: { "arrival-flow": "control" } });
    expect(nonmatch.values["offers.visible"]).toBe(false);
    expect(nonmatch.provenance["offers.visible"]).toEqual({ source: "default" });
    expect(nonmatch.provenance["hero.layout"]).toEqual({ source: "default" });
  });

  it("rejects invalid assignments and overlapping declared ownership including empty controls", () => {
    expect(() => resolveDecisions({ context: india, assignments: { unknown: "control" } })).toThrow(
      /Unknown experiment ID/,
    );
    expect(() =>
      resolveDecisions({ context: india, assignments: { "arrival-flow": "invalid" as never } }),
    ).toThrow(/Unknown variant/);
    expect(() =>
      createDecisionRegistry(
        [
          ...experiments,
          {
            id: "competing",
            owns: ["hero.layout"],
            variants: { control: {}, treatment: {} },
          },
        ],
        ruleEffects,
      ),
    ).toThrow(/hero.layout.*arrival-flow.*competing/);
    expect(() =>
      createDecisionRegistry(experiments, [
        ...ruleEffects,
        {
          id: "overlapping-rule",
          owns: ["destinations.columns"],
          when: { type: "flag", name: "seasonal-offers" },
          patch: {},
        },
      ]),
    ).toThrow(/destinations.columns.*destination-density.*overlapping-rule/);
    expect(() => createDecisionRegistry([...experiments, experiments[0]], ruleEffects)).toThrow(
      /Duplicate registration ID/,
    );
  });
});
