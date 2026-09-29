import { assignVariant, bucketForSurface } from "./bucketing";
import {
  decisionRegistry,
  isDecisionPage,
  type DecisionRegistry,
  type Experiment,
} from "./experiments";
import { evaluateValidatedRule, validateContext } from "./rules";
import { decisionPagePaths, type DecisionPage, type RuleContext, type Variant } from "./types";

export interface AllocateInput {
  visitorId: string;
  context: RuleContext;
  page: DecisionPage;
  overrides?: Readonly<Record<string, string | undefined>>;
  disabledIds?: ReadonlySet<string>;
}

function findSlot(table: readonly Experiment[], bucket: number): Experiment | undefined {
  let low = 0;
  let high = table.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (table[middle].allocation[0] <= bucket) low = middle + 1;
    else high = middle;
  }
  const candidate = table[low - 1];
  return candidate && bucket < candidate.allocation[1] ? candidate : undefined;
}
function relevantToPage(experiment: Experiment, page: DecisionPage): boolean {
  return experiment.owns.some((path) => decisionPagePaths[page].includes(path));
}

// Allocation deliberately keeps override precedence and holdout checks in one pure operation.
// eslint-disable-next-line complexity, max-statements, max-depth
export function assignPageExperiments(
  { visitorId, context, page, overrides, disabledIds }: AllocateInput,
  registry: DecisionRegistry = decisionRegistry,
): { assignments: Record<string, Variant>; ignored: Record<string, string> } {
  if (!isDecisionPage(page)) throw new Error(`Unknown decision page: ${String(page)}`);
  if (typeof visitorId !== "string" || !visitorId.trim()) throw new Error("Invalid visitor ID");
  validateContext(context);
  const assignments: Record<string, Variant> = Object.create(null);
  const ignored: Record<string, string> = Object.create(null);
  const forced = new Map<string, Experiment>();
  const relevant = (experiment: Experiment) => relevantToPage(experiment, page);
  if (overrides !== undefined) {
    if (overrides === null || typeof overrides !== "object" || Array.isArray(overrides))
      throw new Error("Invalid experiment overrides");
    for (const [key, value] of Object.entries(overrides)) {
      if (!key.startsWith("exp.") || !registry.experimentById.has(key.slice(4)))
        throw new Error(`Unknown experiment override: ${key}`);
      if (value !== "auto" && value !== "control" && value !== "treatment") {
        ignored[key] = String(value);
        continue;
      }
      if (value === "auto") continue;
      const experiment = registry.experimentById.get(key.slice(4))!;
      if (
        !relevant(experiment) ||
        !experiment.enabled ||
        disabledIds?.has(experiment.id) ||
        (experiment.eligibleWhen && !evaluateValidatedRule(experiment.eligibleWhen, context))
      ) {
        ignored[key] = value;
        continue;
      }
      const winner = forced.get(experiment.surface);
      if (!winner || experiment.id < winner.id) forced.set(experiment.surface, experiment);
    }
    for (const [key, value] of Object.entries(overrides)) {
      if (value !== "control" && value !== "treatment") continue;
      const experiment = registry.experimentById.get(key.slice(4))!;
      const winner = forced.get(experiment.surface);
      if (
        winner &&
        winner.id !== experiment.id &&
        relevant(experiment) &&
        experiment.enabled &&
        !disabledIds?.has(experiment.id) &&
        (!experiment.eligibleWhen || evaluateValidatedRule(experiment.eligibleWhen, context))
      )
        ignored[key] = `${value} (surface already forced by ${winner.id})`;
    }
  }
  for (const surface of registry.surfacesByPage[page]) {
    const forcedExperiment = forced.get(surface);
    let selected = forcedExperiment;
    if (!selected) {
      const table = registry.allocationsBySurface.get(surface)!;
      selected = findSlot(table, bucketForSurface(visitorId, surface));
    }
    if (
      !selected ||
      !relevant(selected) ||
      !selected.enabled ||
      disabledIds?.has(selected.id) ||
      (selected.eligibleWhen && !evaluateValidatedRule(selected.eligibleWhen, context))
    )
      continue;
    const override = overrides?.[`exp.${selected.id}`];
    assignments[selected.id] =
      override === "control" || override === "treatment"
        ? override
        : assignVariant(visitorId, selected.id);
  }
  return { assignments, ignored };
}
