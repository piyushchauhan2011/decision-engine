import { describe, expect, it, vi } from "vitest";
import {
  assignPageExperiments,
  assignVariant,
  bucketForExperiment,
  bucketForSurface,
  createDecisionRegistry,
  evaluateRule,
  experiments,
  resolveDecisions,
  ruleOperators,
  ruleEffects,
} from "../src/decisions";
import type { RuleContext } from "../src/decisions";

const india: RuleContext = {
  visitor: { country: "IN" },
  flags: { "seasonal-offers": true, "planning-guide": false },
};
const us: RuleContext = {
  visitor: { country: "US" },
  flags: { "seasonal-offers": true, "planning-guide": false },
};

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
      page: "home",
      context: india,
      assignments: { "arrival-flow": "treatment", "destination-density": "treatment" },
    });
    expect(result.values).toEqual({
      "hero.layout": "split",
      "search.layout": "inline",
      "destinationCard.layout": "compact",
      "destinations.columns": "two",
      "offers.visible": true,
      "planningGuide.visible": false,
      "planningGuide.detail": "brief",
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
    const nonmatch = resolveDecisions({
      page: "home",
      context: us,
      assignments: { "arrival-flow": "control" },
    });
    expect(nonmatch.values["offers.visible"]).toBe(false);
    expect(nonmatch.provenance["offers.visible"]).toEqual({ source: "default" });
    expect(nonmatch.provenance["hero.layout"]).toEqual({ source: "default" });
  });

  it("gates planning prompts by flag while varying detail independently of card layout", () => {
    const context: RuleContext = {
      visitor: { country: "US" },
      flags: { "seasonal-offers": false, "planning-guide": true },
    };
    const treatment = resolveDecisions({
      page: "home",
      context,
      assignments: { "planning-guide-detail": "treatment", "arrival-flow": "treatment" },
    });
    expect(treatment.values["planningGuide.visible"]).toBe(true);
    expect(treatment.values["planningGuide.detail"]).toBe("expanded");
    expect(treatment.values["destinationCard.layout"]).toBe("compact");
    expect(treatment.provenance["planningGuide.visible"]).toEqual({
      source: "rule",
      id: "planning-guide-flag",
    });
    expect(treatment.provenance["planningGuide.detail"]).toEqual({
      source: "experiment",
      id: "planning-guide-detail",
      variant: "treatment",
    });
    const control = resolveDecisions({
      page: "home",
      context,
      assignments: { "planning-guide-detail": "control" },
    });
    expect(control.values["planningGuide.detail"]).toBe("brief");
    expect(control.provenance["planningGuide.detail"]).toEqual({ source: "default" });
    const disabled = resolveDecisions({
      page: "home",
      context: { ...context, flags: { ...context.flags, "planning-guide": false } },
      assignments: { "planning-guide-detail": "treatment" },
    });
    expect(disabled.values["planningGuide.visible"]).toBe(false);
    expect(disabled.values["planningGuide.detail"]).toBe("expanded");
  });

  it("rejects invalid assignments and overlapping declared ownership including empty controls", () => {
    expect(() =>
      resolveDecisions({ page: "home", context: india, assignments: { unknown: "control" } }),
    ).toThrow(/Unknown experiment ID/);
    expect(() =>
      resolveDecisions({
        page: "home",
        context: india,
        assignments: { "arrival-flow": "invalid" as never },
      }),
    ).toThrow(/Unknown variant/);
    expect(() =>
      createDecisionRegistry(
        [
          ...experiments,
          {
            id: "competing",
            surface: "other",
            enabled: true,
            allocation: [0, 10000],
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

it("rejects invalid decision patch values instead of rendering unsupported variants", () => {
  expect(() =>
    createDecisionRegistry(
      [
        {
          id: "bad-layout",
          surface: "bad-layout",
          enabled: true,
          allocation: [0, 10000],
          owns: ["hero.layout"],
          variants: { control: {}, treatment: { "hero.layout": "overlay" as never } },
        },
      ],
      [],
    ),
  ).toThrow(/Invalid value for hero.layout/);
  expect(() =>
    createDecisionRegistry(
      [],
      [
        {
          id: "bad-flag",
          owns: ["offers.visible"],
          when: { type: "flag", name: "seasonal-offers" },
          patch: { "offers.visible": "on" as never },
        },
      ],
    ),
  ).toThrow(/Invalid value for offers.visible/);
});

it("allocates globally without redistributing holdouts, disabled or ineligible slots", () => {
  const registry = createDecisionRegistry(
    [
      {
        id: "home-only",
        surface: "shared",
        enabled: true,
        allocation: [0, 5000],
        owns: ["hero.layout"],
        variants: { control: {}, treatment: { "hero.layout": "split" } },
      },
      {
        id: "dest-only",
        surface: "shared",
        enabled: true,
        allocation: [5000, 10000],
        owns: ["destinationCard.layout"],
        eligibleWhen: { type: "eq", field: "visitor.country", value: "IN" },
        variants: { control: {}, treatment: { "destinationCard.layout": "compact" } },
      },
    ],
    [],
  );
  const visitorId = Array.from({ length: 100 }, (_, index) => `visitor-${index}`).find(
    (id) => bucketForSurface(id, "shared") < 5000,
  )!;
  const home = assignPageExperiments({ visitorId, page: "home", context: india }, registry);
  const destinations = assignPageExperiments(
    { visitorId, page: "destinations", context: india },
    registry,
  );
  expect(home.assignments["home-only"]).toBe(assignVariant(visitorId, "home-only"));
  expect(destinations.assignments).toEqual({});
  const disabled = assignPageExperiments(
    {
      visitorId,
      page: "home",
      context: india,
      disabledIds: new Set(["home-only"]),
      overrides: { "exp.home-only": "treatment" },
    },
    registry,
  );
  expect(disabled.assignments).toEqual({});
  expect(
    resolveDecisions({ page: "home", context: india, assignments: disabled.assignments }, registry)
      .values["hero.layout"],
  ).toBe("immersive");
  expect(() =>
    assignPageExperiments({ visitorId, page: "unknown" as never, context: india }, registry),
  ).toThrow(/Unknown decision page/);
  expect(() =>
    assignPageExperiments(
      { visitorId, page: "home", context: india, overrides: { "exp.unknown": "control" } },
      registry,
    ),
  ).toThrow(/Unknown experiment override/);
  expect(() =>
    resolveDecisions(
      { page: "destinations", context: india, assignments: home.assignments },
      registry,
    ),
  ).toThrow(/irrelevant/);
});

it("permits disjoint shared ownership but rejects overlapping slots and simultaneous writes", () => {
  const base = {
    surface: "shared",
    enabled: true,
    owns: ["hero.layout"] as const,
    variants: { control: {}, treatment: { "hero.layout": "split" as const } },
  };
  const first = { ...base, id: "a", allocation: [0, 5000] as const };
  const second = { ...base, id: "b", allocation: [5000, 10000] as const };
  const registry = createDecisionRegistry([first, second], []);
  expect(() =>
    resolveDecisions(
      { page: "home", context: india, assignments: { a: "control", b: "treatment" } },
      registry,
    ),
  ).toThrow(/Multiple assignments on surface/);
  const forced = assignPageExperiments(
    {
      page: "home",
      visitorId: "fixed-id",
      context: india,
      overrides: { "exp.b": "treatment", "exp.a": "control" },
    },
    registry,
  );
  expect(forced.assignments).toEqual({ a: "control" });
  expect(forced.ignored["exp.b"]).toMatch(/surface already forced by a/);
  expect(() =>
    createDecisionRegistry([first, { ...second, allocation: [4999, 10000] }], []),
  ).toThrow(/Overlapping allocation/);
  expect(() => createDecisionRegistry([{ ...first, allocation: [5, 5] }], [])).toThrow(
    /Invalid allocation/,
  );
  expect(() =>
    createDecisionRegistry([{ ...first, enabled: false, allocation: [0, 0] }], []),
  ).not.toThrow();
});

it("never evaluates home-only eligibility on destinations even with a large registry", () => {
  const registry = createDecisionRegistry(
    Array.from({ length: 100 }, (_, index) => ({
      id: `home-${index}`,
      surface: "offers",
      enabled: true,
      allocation: [index * 100, (index + 1) * 100] as const,
      owns: ["offers.visible"] as const,
      eligibleWhen: {
        type: "eq" as const,
        field: "visitor.country" as const,
        value: "IN" as const,
      },
      variants: { control: {}, treatment: { "offers.visible": true } },
    })),
    [],
  );
  const eq = vi.spyOn(ruleOperators, "eq");
  try {
    const assignments = assignPageExperiments(
      { page: "destinations", visitorId: "fixed-id", context: india },
      registry,
    ).assignments;
    const result = resolveDecisions(
      { page: "destinations", context: india, assignments },
      registry,
    );
    expect(eq).not.toHaveBeenCalled();
    expect(result.values["offers.visible"]).toBe(false);
    expect(result.provenance["offers.visible"]).toEqual({ source: "default" });
  } finally {
    eq.mockRestore();
  }
});

it("keeps cross-page assignments stable and leaves gaps and failed eligibility at defaults", () => {
  const visitorId = "fixed-id";
  const home = assignPageExperiments({ visitorId, context: india, page: "home" });
  const destination = assignPageExperiments({ visitorId, context: india, page: "destinations" });
  expect(destination.assignments["arrival-flow"]).toBe(home.assignments["arrival-flow"]);
  const registry = createDecisionRegistry(
    [
      {
        id: "eligible-slot",
        surface: "eligible-slot",
        enabled: true,
        allocation: [0, 100],
        owns: ["hero.layout"],
        eligibleWhen: { type: "eq", field: "visitor.country", value: "IN" },
        variants: { control: {}, treatment: { "hero.layout": "split" } },
      },
    ],
    [],
  );
  const gapVisitor = Array.from({ length: 100 }, (_, i) => `gap-${i}`).find(
    (id) => bucketForSurface(id, "eligible-slot") >= 100,
  )!;
  const gap = assignPageExperiments(
    { page: "home", visitorId: gapVisitor, context: india },
    registry,
  );
  expect(gap.assignments).toEqual({});
  const ineligible = assignPageExperiments(
    {
      page: "home",
      visitorId: gapVisitor,
      context: us,
      overrides: { "exp.eligible-slot": "treatment" },
    },
    registry,
  );
  expect(ineligible.assignments).toEqual({});
  expect(() =>
    resolveDecisions(
      { page: "home", context: us, assignments: { "eligible-slot": "treatment" } },
      registry,
    ),
  ).toThrow(/ineligible/);
  expect(
    resolveDecisions({ page: "home", context: us, assignments: gap.assignments }, registry)
      .provenance["hero.layout"],
  ).toEqual({ source: "default" });
  expect(() => resolveDecisions({ page: "home", context: {} as never, assignments: {} })).toThrow(
    /Invalid/,
  );
});
