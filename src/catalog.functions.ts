import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { listDestinations, listHomeCatalog } from "./db/catalog.server";

export const getHomeCatalog = createServerFn({ method: "GET" }).handler(async () => {
  return listHomeCatalog().match(
    (catalog) => catalog,
    (error) => {
      throw error;
    },
  );
});

export const getDestinations = createServerFn({ method: "GET" })
  .validator(
    z.object({
      destination: z
        .string()
        .regex(/^[a-z0-9-]{1,80}$/)
        .optional(),
    }),
  )
  .handler(async ({ data }) => {
    return listDestinations(data.destination).match(
      (destinations) => destinations,
      (error) => {
        throw error;
      },
    );
  });
