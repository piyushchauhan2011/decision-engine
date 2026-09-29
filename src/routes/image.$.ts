import { createFileRoute } from "@tanstack/react-router";
import { createIPX, ipxFSStorage } from "ipx";
import { resolve } from "node:path";

// Only local catalog images; no remote fetching or client-supplied IPX modifiers.
const ipx = createIPX({
  storage: ipxFSStorage({
    dir: [resolve(process.cwd(), "public/images"), resolve(process.cwd(), ".output/public/images")],
  }),
});

export const Route = createFileRoute("/image/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const match = /^\/image\/(480|800|1280)\/([a-z0-9-]+\.webp)$/.exec(
          new URL(request.url).pathname,
        );
        if (!match) return new Response("Image not found", { status: 404 });

        try {
          const { data } = await ipx(match[2], { w: match[1], f: "webp", q: "72" }).process();
          return new Response(data as BodyInit, {
            headers: {
              "content-type": "image/webp",
              "cache-control": "public, max-age=604800",
            },
          });
        } catch (error) {
          if (
            error &&
            typeof error === "object" &&
            "statusCode" in error &&
            error.statusCode === 404
          ) {
            return new Response("Image not found", { status: 404 });
          }
          throw error;
        }
      },
    },
  },
});
