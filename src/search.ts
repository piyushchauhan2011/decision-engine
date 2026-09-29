import { useLocation } from "@tanstack/react-router";
import { pickBy } from "es-toolkit/object";
import { z } from "zod";

export const searchSchema = z.object({
  destination: z.string().optional(),
  country: z.string().optional(),
  offers: z.string().optional(),
  guide: z.string().optional(),
  "exp.arrival-flow": z.string().optional(),
  "exp.destination-density": z.string().optional(),
  "exp.planning-guide-detail": z.string().optional(),
});

export type PageSearch = z.infer<typeof searchSchema>;
export type InspectorSearch = Pick<
  PageSearch,
  | "country"
  | "offers"
  | "guide"
  | "exp.arrival-flow"
  | "exp.destination-density"
  | "exp.planning-guide-detail"
>;

export function validatePageSearch(input: unknown): PageSearch {
  const source = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const strings = pickBy(source, (value) => typeof value === "string");
  return searchSchema.parse(strings);
}

export function usePageSearch(): PageSearch {
  const search = useLocation({ select: (location) => location.search });
  return validatePageSearch(search);
}

export function inspectorSearch(search: PageSearch): InspectorSearch {
  return {
    country: search.country,
    offers: search.offers,
    guide: search.guide,
    "exp.arrival-flow": search["exp.arrival-flow"],
    "exp.destination-density": search["exp.destination-density"],
    "exp.planning-guide-detail": search["exp.planning-guide-detail"],
  };
}

export function inspectorOverrides(search: PageSearch): InspectorSearch {
  return pickBy(inspectorSearch(search), (value) => typeof value === "string");
}
