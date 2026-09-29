import { createHmac, timingSafeEqual } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { experiments } from "./decisions/experiments";
import { resolveDecisionRequest } from "./decisions/request.server";
import { rolloutConfig } from "./decisions/rollout.server";

const requestSchema = z.object({
  page: z.enum(["home", "destinations"]),
  country: z.string().optional(),
  offers: z.string().optional(),
  guide: z.string().optional(),
  ...Object.fromEntries(experiments.map(({ id }) => [`exp.${id}`, z.string().optional()])),
});

function signature(id: string, secret: string): string {
  return createHmac("sha256", secret).update(id).digest("hex");
}

function visitorFromCookie(
  cookie: string | undefined,
  secret: string | undefined,
): string | undefined {
  if (!secret) return z.uuid().safeParse(cookie).success ? cookie : undefined;
  if (!cookie) return undefined;
  const match = /^([0-9a-f-]{36})\.([0-9a-f]{64})$/.exec(cookie);
  if (!match || !z.uuid().safeParse(match[1]).success) return undefined;
  const supplied = Buffer.from(match[2], "hex");
  const expected = Buffer.from(signature(match[1], secret), "hex");
  return timingSafeEqual(supplied, expected) ? match[1] : undefined;
}

export const getPageDecisions = createServerFn({ method: "GET" })
  .validator(requestSchema)
  .handler(async ({ data }) => {
    const existingId = visitorFromCookie(getCookie("visitorId"), rolloutConfig.cookieSecret);
    const visitorId = existingId ?? crypto.randomUUID();
    if (!existingId) {
      setCookie(
        "visitorId",
        rolloutConfig.cookieSecret
          ? `${visitorId}.${signature(visitorId, rolloutConfig.cookieSecret)}`
          : visitorId,
        {
          path: "/",
          sameSite: "lax",
          httpOnly: true,
          maxAge: 31536000,
          secure: process.env.NODE_ENV === "production",
        },
      );
    }
    return resolveDecisionRequest({
      page: data.page,
      search: data,
      visitorId,
      production: process.env.NODE_ENV === "production",
      rollout: rolloutConfig,
    });
  });
