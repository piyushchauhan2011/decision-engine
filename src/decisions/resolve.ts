import { decisionRegistry, type DecisionRegistry } from "./experiments";
import { evaluateRule } from "./rules";
import {
  decisionDefaults,
  type DecisionPath,
  type DecisionProvenance,
  type DecisionResult,
  type DecisionValues,
  type RuleContext,
  type Variant,
} from "./types";

export interface ResolveDecisionsInput {
  context: RuleContext;
  assignments: Readonly<Record<string, Variant | undefined>>;
}

export function resolveDecisions(
  { context, assignments }: ResolveDecisionsInput,
  registry: DecisionRegistry = decisionRegistry,
): DecisionResult {
  if (assignments === null || typeof assignments !== "object" || Array.isArray(assignments)) {
    throw new Error("Invalid experiment assignments: expected an object");
  }

  const registered = new Map(registry.experiments.map((experiment) => [experiment.id, experiment]));
  const selected = new Map<string, Variant>();
  for (const [id, variant] of Object.entries(assignments)) {
    if (!registered.has(id)) throw new Error(`Unknown experiment ID: ${id}`);
    if (variant !== "control" && variant !== "treatment") {
      throw new Error(`Unknown variant for experiment ${id}: ${String(variant)}`);
    }
    selected.set(id, variant);
  }

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
  for (const experiment of registry.experiments) {
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
  for (const effect of registry.ruleEffects) {
    if (evaluateRule(effect.when, context)) {
      apply(effect.patch, `rule ${effect.id}`, { source: "rule", id: effect.id });
    }
  }
  return { values, provenance, assignments: resolvedAssignments };
}
