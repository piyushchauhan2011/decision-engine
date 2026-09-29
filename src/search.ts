import { z } from "zod";

export const searchSchema = z.object({
  destination: z.string().optional(),
  country: z.string().optional(),
  offers: z.string().optional(),
  "exp.arrival-flow": z.string().optional(),
  "exp.destination-density": z.string().optional(),
});

export type PageSearch = z.infer<typeof searchSchema>;
export type InspectorSearch = Pick<
  PageSearch,
  "country" | "offers" | "exp.arrival-flow" | "exp.destination-density"
>;

export function validatePageSearch(input: unknown): PageSearch {
  const source = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const strings = Object.fromEntries(
    Object.entries(source).filter(([, value]) => typeof value === "string"),
  );
  return searchSchema.parse(strings);
}

export function inspectorSearch(search: PageSearch): InspectorSearch {
  return {
    country: search.country,
    offers: search.offers,
    "exp.arrival-flow": search["exp.arrival-flow"],
    "exp.destination-density": search["exp.destination-density"],
  };
}

export function inspectorOverrides(search: PageSearch): Record<string, string> {
  return Object.fromEntries(
    Object.entries(inspectorSearch(search)).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}
