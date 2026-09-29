import { expect, it } from "vitest";
import { resolveDecisionRequest } from "../src/decisions/request.server";

it("ignores direct public overrides in production but retains trusted rollout flags", () => {
  const base = {
    page: "home" as const,
    visitorId: "fixed-id",
    production: true,
    rollout: { disabledIds: new Set<string>(), seasonalOffers: false, planningGuide: true },
  };
  const plain = resolveDecisionRequest({ ...base, search: {} });
  const tampered = resolveDecisionRequest({
    ...base,
    search: { country: "IN", offers: "on", guide: "off", "exp.arrival-flow": "treatment" },
  });
  expect(tampered).toEqual(plain);
  expect(plain.values["offers.visible"]).toBe(false);
  expect(plain.values["planningGuide.visible"]).toBe(true);
});
