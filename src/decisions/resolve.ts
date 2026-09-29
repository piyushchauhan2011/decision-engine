import { decisionRegistry, isDecisionPage, type DecisionRegistry } from "./experiments";
import { evaluateValidatedRule, validateContext } from "./rules";
import {
  decisionDefaults,
  type DecisionPath,
  type DecisionPage,
  type DecisionProvenance,
  type DecisionResult,
  type DecisionValues,
  type RuleContext,
  type Variant,
} from "./types";

export interface ResolveDecisionsInput {
  page: DecisionPage;
  context: RuleContext;
  assignments: Readonly<Record<string, Variant | undefined>>;
}

// Validate all externally supplied assignments before applying any patch.
// eslint-disable-next-line complexity, max-params
function selectAssignments(
  assignments: ResolveDecisionsInput["assignments"],
  registry: DecisionRegistry,
  page: DecisionPage,
  context: RuleContext,
): Map<string, Variant> {
  if (assignments === null || typeof assignments !== "object" || Array.isArray(assignments)) {
    throw new Error("Invalid experiment assignments: expected an object");
  }
  const selected = new Map<string, Variant>();
  const surfaces = new Set<string>();
  const relevant = new Set(registry.experimentsByPage[page].map((experiment) => experiment.id));
  for (const [id, variant] of Object.entries(assignments)) {
    const experiment = registry.experimentById.get(id);
    if (!experiment) throw new Error(`Unknown experiment ID: ${id}`);
    if (variant !== "control" && variant !== "treatment")
      throw new Error(`Unknown variant for experiment ${id}: ${String(variant)}`);
    if (!relevant.has(id)) throw new Error(`Experiment ${id} is irrelevant to page ${page}`);
    if (
      !experiment.enabled ||
      (experiment.eligibleWhen && !evaluateValidatedRule(experiment.eligibleWhen, context))
    )
      throw new Error(`Experiment ${id} is disabled or ineligible`);
    if (surfaces.has(experiment.surface))
      throw new Error(`Multiple assignments on surface ${experiment.surface}`);
    surfaces.add(experiment.surface);
    selected.set(id, variant);
  }
  return selected;
}

export function resolveDecisions(
  { page, context, assignments }: ResolveDecisionsInput,
  registry: DecisionRegistry = decisionRegistry,
): DecisionResult {
  if (!isDecisionPage(page)) throw new Error(`Unknown decision page: ${String(page)}`);
  validateContext(context);
  const selected = selectAssignments(assignments, registry, page, context);

  const values: DecisionValues = { ...decisionDefaults };
  const provenance: Record<DecisionPath, DecisionProvenance> = {
    "hero.layout": { source: "default" },
    "search.layout": { source: "default" },
    "destinationCard.layout": { source: "default" },
    "destinations.columns": { source: "default" },
    "offers.visible": { source: "default" },
    "planningGuide.visible": { source: "default" },
    "planningGuide.detail": { source: "default" },
  };
  const writtenBy = new Map<DecisionPath, string>();

  function apply(patch: Partial<DecisionValues>, owner: string, source: DecisionProvenance): void {
    for (const path of Object.keys(patch) as DecisionPath[]) {
      const previous = writtenBy.get(path);
      if (previous) throw new Error(`Decision write conflict on ${path}: ${previous} and ${owner}`);
      writtenBy.set(path, owner);
      provenance[path] = source;
    }
    Object.assign(values, patch);
  }

  const resolvedAssignments: Record<string, Variant> = {};
  for (const experiment of registry.experimentsByPage[page]) {
    const variant = selected.get(experiment.id);
    if (variant === undefined) continue;
    Object.defineProperty(resolvedAssignments, experiment.id, {
      value: variant,
      enumerable: true,
      writable: true,
      configurable: true,
    });
    apply(experiment.variants[variant], `experiment ${experiment.id}/${variant}`, {
      source: "experiment",
      id: experiment.id,
      variant,
    });
  }
  for (const effect of registry.rulesByPage[page]) {
    if (evaluateValidatedRule(effect.when, context)) {
      apply(effect.patch, `rule ${effect.id}`, { source: "rule", id: effect.id });
    }
  }
  return { values, provenance, assignments: resolvedAssignments };
}
