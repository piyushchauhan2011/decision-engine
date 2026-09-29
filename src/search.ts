import { useLocation } from "@tanstack/react-router";
import { experiments, type ExperimentId } from "./decisions/experiments";
import { pickBy } from "es-toolkit/object";
import { z } from "zod";

const stringSearchSchema = z.record(z.string(), z.string());
const allowedExperiments = new Set<string>(experiments.map(({ id }) => `exp.${id}`));

export type InspectorSearch = Partial<
  Record<"country" | "offers" | "guide" | `exp.${ExperimentId}`, string>
>;
export type PageSearch = InspectorSearch & { destination?: string };

export function validatePageSearch(input: unknown): PageSearch {
  const source =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  const strings = stringSearchSchema.parse(pickBy(source, (value) => typeof value === "string"));
  const result: PageSearch = {};
  if (strings.destination !== undefined) result.destination = strings.destination;
  if (!import.meta.env.PROD) {
    for (const [key, value] of Object.entries(strings)) {
      if (key === "country" || key === "offers" || key === "guide" || allowedExperiments.has(key))
        (result as Record<string, string>)[key] = value;
    }
  }
  return result;
}

export function usePageSearch(): PageSearch {
  const search = useLocation({ select: (location) => location.search });
  return validatePageSearch(search);
}

export function inspectorSearch(search: PageSearch): InspectorSearch {
  if (import.meta.env.PROD) return {};
  const { destination: _destination, ...overrides } = validatePageSearch(search);
  return overrides;
}

export function inspectorOverrides(search: PageSearch): InspectorSearch {
  return inspectorSearch(search);
}
