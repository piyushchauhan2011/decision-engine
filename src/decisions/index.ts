export { assignVariant, bucketForExperiment, bucketForSurface, fnv1a32 } from "./bucketing";
export { assignPageExperiments } from "./allocate";
export {
  createDecisionRegistry,
  decisionRegistry,
  experiments,
  type DecisionRegistry,
  type Experiment,
  type ExperimentId,
} from "./experiments";
export { resolveDecisions, type ResolveDecisionsInput } from "./resolve";
export {
  evaluateRule,
  ruleEffects,
  ruleOperators,
  validateRule,
  type Rule,
  type RuleEffect,
} from "./rules";
export {
  decisionDefaults,
  decisionPagePaths,
  type DecisionPage,
  type DecisionPath,
  type DecisionProvenance,
  type DecisionResult,
  type DecisionValues,
  type RuleContext,
  type Variant,
} from "./types";
