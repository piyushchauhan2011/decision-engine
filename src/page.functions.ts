import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { assignVariant, experiments, resolveDecisions } from "./decisions";

const overridesSchema = z.object({
  country: z.string().optional(),
  offers: z.string().optional(),
  guide: z.string().optional(),
  "exp.arrival-flow": z.string().optional(),
  "exp.destination-density": z.string().optional(),
  "exp.planning-guide-detail": z.string().optional(),
});

type Overrides = z.infer<typeof overridesSchema>;
type IgnoredOverrides = Record<string, string>;

function parseCountry(value: string | undefined, ignored: IgnoredOverrides): "IN" | "US" {
  if (value === "IN" || value === "US") return value;
  if (value !== undefined) ignored.country = value;
  return "US";
}

function parseFlag(
  value: string | undefined,
  key: "offers" | "guide",
  ignored: IgnoredOverrides,
): boolean {
  if (value !== undefined && value !== "on" && value !== "off") ignored[key] = value;
  return value === "on";
}

function parseAssignments(
  data: Overrides,
  visitorId: string,
  ignored: IgnoredOverrides,
): Record<string, "control" | "treatment"> {
  const assignments: Record<string, "control" | "treatment"> = {};
  for (const experiment of experiments) {
    const key = `exp.${experiment.id}`;
    const override = data[key as keyof Overrides];
    if (
      override !== undefined &&
      override !== "auto" &&
      override !== "control" &&
      override !== "treatment"
    )
      ignored[key] = override;
    assignments[experiment.id] =
      override === "control" || override === "treatment"
        ? override
        : assignVariant(visitorId, experiment.id);
  }
  return assignments;
}

export const getPageDecisions = createServerFn({ method: "GET" })
  .validator(overridesSchema)
  .handler(async ({ data }) => {
    const cookie = getCookie("visitorId");
    let visitorId = z.uuid().safeParse(cookie).success ? cookie! : undefined;
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      setCookie("visitorId", visitorId, {
        path: "/",
        sameSite: "lax",
        httpOnly: true,
        maxAge: 31536000,
        secure: process.env.NODE_ENV === "production",
      });
    }
    const ignored: Record<string, string> = {};
    const country = parseCountry(data.country, ignored);
    const offers = parseFlag(data.offers, "offers", ignored);
    const guide = parseFlag(data.guide, "guide", ignored);
    const assignments = parseAssignments(data, visitorId, ignored);
    return {
      ...resolveDecisions({
        context: {
          visitor: { country },
          flags: { "seasonal-offers": offers, "planning-guide": guide },
        },
        assignments,
      }),
      ignored,
    };
  });
