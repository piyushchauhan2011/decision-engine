import type { DecisionPath, DecisionValues, RuleContext } from "./types";

export type Rule =
  | { type: "all"; rules: readonly Rule[] }
  | { type: "any"; rules: readonly Rule[] }
  | { type: "not"; rule: Rule }
  | { type: "eq"; field: "visitor.country"; value: "IN" | "US" }
  | { type: "flag"; name: keyof RuleContext["flags"] };

export interface RuleEffect {
  id: string;
  owns: readonly DecisionPath[];
  when: Rule;
  patch: Partial<DecisionValues>;
}

// Operators are code, never parsed or evaluated from a string expression.
export const ruleOperators = {
  eq: (actual: "IN" | "US", expected: "IN" | "US"): boolean => actual === expected,
} as const;

function objectValue(value: unknown, description: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid ${description}: expected an object`);
  }
  return value as Record<string, unknown>;
}

export function validateRule(value: unknown): asserts value is Rule {
  const node = objectValue(value, "rule");
  switch (node.type) {
    case "all":
    case "any":
      if (!Array.isArray(node.rules)) {
        throw new Error(`Invalid ${node.type} rule: expected rules array`);
      }
      for (const child of node.rules) validateRule(child);
      return;
    case "not":
      validateRule(node.rule);
      return;
    case "eq":
      if (node.field !== "visitor.country") {
        throw new Error(`Unknown rule field: ${String(node.field)}`);
      }
      if (node.value !== "IN" && node.value !== "US") {
        throw new Error(`Invalid visitor.country rule value: ${String(node.value)}`);
      }
      return;
    case "flag":
      if (node.name !== "seasonal-offers" && node.name !== "planning-guide") {
        throw new Error(`Unknown rule flag: ${String(node.name)}`);
      }
      return;
    default:
      throw new Error(`Unknown rule node: ${String(node.type)}`);
  }
}

function validateContext(value: unknown): asserts value is RuleContext {
  const context = objectValue(value, "rule context");
  const visitor = objectValue(context.visitor, "visitor");
  const flags = objectValue(context.flags, "flags");
  if (visitor.country !== "IN" && visitor.country !== "US") {
    throw new Error(`Invalid visitor.country: ${String(visitor.country)}`);
  }
  if (typeof flags["seasonal-offers"] !== "boolean") {
    throw new Error("Invalid seasonal-offers flag: expected boolean");
  }
  if (typeof flags["planning-guide"] !== "boolean") {
    throw new Error("Invalid planning-guide flag: expected boolean");
  }
}

function evaluateValidatedRule(rule: Rule, context: RuleContext): boolean {
  switch (rule.type) {
    case "all":
      return rule.rules.every((child) => evaluateValidatedRule(child, context));
    case "any":
      return rule.rules.some((child) => evaluateValidatedRule(child, context));
    case "not":
      return !evaluateValidatedRule(rule.rule, context);
    case "eq":
      return ruleOperators.eq(context.visitor.country, rule.value);
    case "flag":
      return context.flags[rule.name];
  }
}

export function evaluateRule(rule: Rule, context: RuleContext): boolean {
  // Validate the whole tree first, including branches that would short-circuit.
  validateRule(rule);
  validateContext(context);
  return evaluateValidatedRule(rule, context);
}

export const ruleEffects: readonly RuleEffect[] = [
  {
    id: "india-seasonal-offers",
    owns: ["offers.visible"],
    when: {
      type: "all",
      rules: [
        { type: "flag", name: "seasonal-offers" },
        { type: "eq", field: "visitor.country", value: "IN" },
      ],
    },
    patch: { "offers.visible": true },
  },
  {
    id: "planning-guide-flag",
    owns: ["planningGuide.visible"],
    when: { type: "flag", name: "planning-guide" },
    patch: { "planningGuide.visible": true },
  },
];
