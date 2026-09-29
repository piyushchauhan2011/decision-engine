import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { assignVariant, experiments, resolveDecisions } from "./decisions";

const overridesSchema = z.object({
  country: z.string().optional(),
  offers: z.string().optional(),
  "exp.arrival-flow": z.string().optional(),
  "exp.destination-density": z.string().optional(),
});

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
    const country = data.country === "IN" || data.country === "US" ? data.country : "US";
    if (data.country !== undefined && data.country !== "IN" && data.country !== "US")
      ignored.country = data.country;
    const offers = data.offers === "on" ? true : false;
    if (data.offers !== undefined && data.offers !== "on" && data.offers !== "off")
      ignored.offers = data.offers;
    const assignments: Record<string, "control" | "treatment"> = {};
    for (const experiment of experiments) {
      const override = data[`exp.${experiment.id}` as keyof typeof data];
      if (
        override !== undefined &&
        override !== "auto" &&
        override !== "control" &&
        override !== "treatment"
      )
        ignored[`exp.${experiment.id}`] = override;
      assignments[experiment.id] =
        override === "control" || override === "treatment"
          ? override
          : assignVariant(visitorId, experiment.id);
    }
    return {
      ...resolveDecisions({
        context: { visitor: { country }, flags: { "seasonal-offers": offers } },
        assignments,
      }),
      ignored,
    };
  });
