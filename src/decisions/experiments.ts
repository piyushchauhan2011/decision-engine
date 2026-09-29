import { ruleEffects, validateRule, type Rule, type RuleEffect } from "./rules";
import {
  decisionDefaults,
  decisionPagePaths,
  type DecisionPage,
  type DecisionPath,
  type DecisionValues,
} from "./types";

export interface Experiment {
  id: string;
  surface: string;
  enabled: boolean;
  allocation: readonly [start: number, end: number];
  eligibleWhen?: Rule;
  owns: readonly DecisionPath[];
  variants: { control: Partial<DecisionValues>; treatment: Partial<DecisionValues> };
}

export const experiments = [
  {
    id: "arrival-flow",
    surface: "arrival-flow",
    enabled: true,
    allocation: [0, 10000],
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
    surface: "destination-density",
    enabled: true,
    allocation: [0, 10000],
    owns: ["destinations.columns"],
    variants: {
      control: {},
      treatment: { "destinations.columns": "two" },
    },
  },
  {
    id: "planning-guide-detail",
    surface: "planning-guide-detail",
    enabled: true,
    allocation: [0, 10000],
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
  experimentsByPage: Readonly<Record<DecisionPage, readonly Experiment[]>>;
  rulesByPage: Readonly<Record<DecisionPage, readonly RuleEffect[]>>;
  surfacesByPage: Readonly<Record<DecisionPage, readonly string[]>>;
  experimentById: ReadonlyMap<string, Experiment>;
  allocationsBySurface: ReadonlyMap<string, readonly Experiment[]>;
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

export function isDecisionPage(page: unknown): page is DecisionPage {
  return page === "home" || page === "destinations";
}

// Registration performs all schema, ownership, and interval checks once, never per request.
// eslint-disable-next-line complexity, max-statements, max-lines-per-function
export function createDecisionRegistry(
  registeredExperiments: readonly Experiment[],
  registeredEffects: readonly RuleEffect[],
): DecisionRegistry {
  const claimed = new Map<DecisionPath, { owner: string; surface?: string }>();
  const registeredIds = new Set<string>();
  const experimentById = new Map<string, Experiment>();
  const allocationsBySurface = new Map<string, Experiment[]>();
  const pages = Object.keys(decisionPagePaths) as DecisionPage[];
  const experimentsByPage = { home: [] as Experiment[], destinations: [] as Experiment[] };
  const rulesByPage = { home: [] as RuleEffect[], destinations: [] as RuleEffect[] };

  // eslint-disable-next-line complexity, max-params
  function registerOwner(
    id: string,
    kind: string,
    owns: readonly DecisionPath[],
    surface?: string,
  ): Set<DecisionPath> {
    if (typeof id !== "string" || !id.trim() || !Array.isArray(owns) || owns.length === 0)
      throw new Error(`Invalid ${kind} registration: id and nonempty owns are required`);
    if (registeredIds.has(id)) throw new Error(`Duplicate registration ID: ${id}`);
    registeredIds.add(id);
    const owner = `${kind} ${id}`;
    const paths = new Set<DecisionPath>();
    for (const path of owns) {
      if (!isDecisionPath(path))
        throw new Error(`Unknown decision path ${String(path)} in ${owner}`);
      if (!pages.some((page) => decisionPagePaths[page].includes(path)))
        throw new Error(`Decision path ${path} in ${owner} is not on any page`);
      const previous = claimed.get(path);
      if (paths.has(path) || (previous && (!surface || previous.surface !== surface)))
        throw new Error(`Ownership conflict on ${path}: ${previous?.owner ?? owner} and ${owner}`);
      paths.add(path);
    }
    for (const path of paths) claimed.set(path, { owner, surface });
    return paths;
  }

  for (const experiment of registeredExperiments) {
    const owns = registerOwner(experiment.id, "experiment", experiment.owns, experiment.surface);
    if (typeof experiment.surface !== "string" || !experiment.surface.trim())
      throw new Error(`Invalid surface for experiment ${experiment.id}`);
    if (typeof experiment.enabled !== "boolean")
      throw new Error(`Invalid enabled for experiment ${experiment.id}`);
    const range = experiment.allocation;
    if (
      !Array.isArray(range) ||
      range.length !== 2 ||
      !range.every((value) => Number.isInteger(value) && value >= 0 && value <= 10000) ||
      range[0] > range[1] ||
      (range[0] === range[1] && range[0] !== 0)
    )
      throw new Error(`Invalid allocation for experiment ${experiment.id}`);
    if (experiment.eligibleWhen !== undefined) validateRule(experiment.eligibleWhen);
    for (const variant of ["control", "treatment"] as const)
      checkPatch(`experiment ${experiment.id}/${variant}`, owns, experiment.variants?.[variant]);
    experimentById.set(experiment.id, experiment);
    const table = allocationsBySurface.get(experiment.surface) ?? [];
    table.push(experiment);
    allocationsBySurface.set(experiment.surface, table);
    for (const page of pages)
      if (decisionPagePaths[page].some((path) => owns.has(path)))
        experimentsByPage[page].push(experiment);
  }
  for (const effect of registeredEffects) {
    const owns = registerOwner(effect.id, "rule", effect.owns);
    validateRule(effect.when);
    checkPatch(`rule ${effect.id}`, owns, effect.patch);
    for (const page of pages)
      if (decisionPagePaths[page].some((path) => owns.has(path))) rulesByPage[page].push(effect);
  }
  for (const [surface, table] of allocationsBySurface) {
    table.sort((a, b) => a.allocation[0] - b.allocation[0] || a.allocation[1] - b.allocation[1]);
    let end = 0;
    for (const experiment of table) {
      const [start, nextEnd] = experiment.allocation;
      if (start === nextEnd) continue;
      if (start < end)
        throw new Error(`Overlapping allocation on surface ${surface}: ${experiment.id}`);
      end = nextEnd;
    }
  }
  const surfacesByPage = {
    home: [...new Set(experimentsByPage.home.map((experiment) => experiment.surface))],
    destinations: [
      ...new Set(experimentsByPage.destinations.map((experiment) => experiment.surface)),
    ],
  };
  return {
    experiments: registeredExperiments,
    ruleEffects: registeredEffects,
    experimentsByPage,
    rulesByPage,
    surfacesByPage,
    experimentById,
    allocationsBySurface,
  };
}

export const decisionRegistry = createDecisionRegistry(experiments, ruleEffects);
