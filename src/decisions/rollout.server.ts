import { decisionRegistry } from "./experiments";

function flag(name: string): boolean {
  const value = process.env[name];
  if (value !== undefined && value !== "" && value !== "on")
    throw new Error(`Invalid ${name}: expected on or empty`);
  return value === "on";
}

function disabledExperiments(): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const entry of (process.env.DECISION_DISABLED_EXPERIMENTS ?? "").split(",")) {
    const id = entry.trim();
    if (!id) continue;
    if (!decisionRegistry.experimentById.has(id))
      throw new Error(`Invalid DECISION_DISABLED_EXPERIMENTS: unknown experiment ${id}`);
    ids.add(id);
  }
  return ids;
}

function cookieSecret(): string | undefined {
  if (process.env.NODE_ENV !== "production") return undefined;
  const secret = process.env.DECISION_COOKIE_SECRET;
  if (!secret || Buffer.byteLength(secret, "utf8") < 32)
    throw new Error("Invalid DECISION_COOKIE_SECRET: at least 32 UTF-8 bytes required");
  return secret;
}

export const rolloutConfig = {
  disabledIds: disabledExperiments(),
  seasonalOffers: flag("DECISION_SEASONAL_OFFERS"),
  planningGuide: flag("DECISION_PLANNING_GUIDE"),
  cookieSecret: cookieSecret(),
};
