import { ruleEffects, validateRule, type RuleEffect } from "./rules";
import { decisionDefaults, type DecisionPath, type DecisionValues } from "./types";

export interface Experiment {
  id: string;
  owns: readonly DecisionPath[];
  variants: { control: Partial<DecisionValues>; treatment: Partial<DecisionValues> };
}

export const experiments = [
  {
    id: "arrival-flow",
    owns: ["hero.layout", "search.layout", "destinationCard.layout"],
    variants: {
      control: {},
      treatment: {
        "hero.layout": "split",
        "search.layout": "inline",
        "destinationCard.layout": "compact",
      },
    },
  },
  {
    id: "destination-density",
    owns: ["destinations.columns"],
    variants: {
      control: {},
      treatment: { "destinations.columns": "two" },
    },
  },
  {
    id: "planning-guide-detail",
    owns: ["planningGuide.detail"],
    variants: {
      control: {},
      treatment: { "planningGuide.detail": "expanded" },
    },
  },
] as const satisfies readonly Experiment[];

export type ExperimentId = (typeof experiments)[number]["id"];

export interface DecisionRegistry {
  experiments: readonly Experiment[];
  ruleEffects: readonly RuleEffect[];
}

function isDecisionPath(path: string): path is DecisionPath {
  return Object.prototype.hasOwnProperty.call(decisionDefaults, path);
}

const allowedPatchValues = {
  "hero.layout": ["immersive", "split"],
  "search.layout": ["overlay", "inline"],
  "destinationCard.layout": ["image", "compact"],
  "destinations.columns": ["three", "two"],
  "offers.visible": "boolean",
  "planningGuide.visible": "boolean",
  "planningGuide.detail": ["brief", "expanded"],
} as const satisfies {
  [Path in DecisionPath]:
    | readonly DecisionValues[Path][]
    | (DecisionValues[Path] extends boolean ? "boolean" : never);
};

function isValidPatchValue(path: DecisionPath, value: unknown): boolean {
  const allowed = allowedPatchValues[path];
  return allowed === "boolean"
    ? typeof value === "boolean"
    : (allowed as readonly unknown[]).includes(value);
}

function checkPatch(owner: string, owns: ReadonlySet<DecisionPath>, patch: unknown): void {
  if (patch === null || typeof patch !== "object" || Array.isArray(patch)) {
    throw new Error(`Invalid patch for ${owner}: expected an object`);
  }
  for (const [path, value] of Object.entries(patch)) {
    if (!isDecisionPath(path)) throw new Error(`Unknown decision path ${path} in ${owner}`);
    if (!owns.has(path)) throw new Error(`${owner} writes ${path} without owning it`);
    if (!isValidPatchValue(path, value)) {
      throw new Error(`Invalid value for ${path} in ${owner}`);
    }
  }
}

export function createDecisionRegistry(
  registeredExperiments: readonly Experiment[],
  registeredEffects: readonly RuleEffect[],
): DecisionRegistry {
  const claimed = new Map<DecisionPath, string>();
  const registeredIds = new Set<string>();

  function registerOwner(
    id: string,
    kind: string,
    owns: readonly DecisionPath[],
  ): Set<DecisionPath> {
    if (!id || !Array.isArray(owns))
      throw new Error(`Invalid ${kind} registration: id and owns are required`);
    const owner = `${kind} ${id}`;
    const paths = new Set<DecisionPath>();
    for (const path of owns) {
      if (!isDecisionPath(path))
        throw new Error(`Unknown decision path ${String(path)} in ${owner}`);
      const previous = claimed.get(path);
      if (previous) throw new Error(`Ownership conflict on ${path}: ${previous} and ${owner}`);
      if (paths.has(path)) throw new Error(`Ownership conflict on ${path}: ${owner} and ${owner}`);
      paths.add(path);
    }
    for (const path of paths) claimed.set(path, owner);
    return paths;
  }

  for (const experiment of registeredExperiments) {
    if (registeredIds.has(experiment.id))
      throw new Error(`Duplicate registration ID: ${experiment.id}`);
    registeredIds.add(experiment.id);
    const owns = registerOwner(experiment.id, "experiment", experiment.owns);
    for (const variant of ["control", "treatment"] as const) {
      checkPatch(`experiment ${experiment.id}/${variant}`, owns, experiment.variants?.[variant]);
    }
  }
  for (const effect of registeredEffects) {
    if (registeredIds.has(effect.id)) throw new Error(`Duplicate registration ID: ${effect.id}`);
    registeredIds.add(effect.id);
    const owns = registerOwner(effect.id, "rule", effect.owns);
    validateRule(effect.when);
    checkPatch(`rule ${effect.id}`, owns, effect.patch);
  }
  return { experiments: registeredExperiments, ruleEffects: registeredEffects };
}

export const decisionRegistry = createDecisionRegistry(experiments, ruleEffects);
