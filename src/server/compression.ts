import { compressResponseStream } from "h3-compression";
import { definePlugin } from "nitro";

export default definePlugin((app) => {
  if (!app.h3) throw new Error("Nitro H3 app is unavailable");

  app.h3["~middleware"].push(async (event, next) => {
    const response = await next();
    if (!(response instanceof Response)) return response;
    if (!response.headers.get("content-type")?.startsWith("text/html")) return response;

    // Only dynamic HTML: assets already have precompressed variants and images are WebP.
    const compressed = await compressResponseStream(event, response, undefined, { brotli: true });
    compressed.headers.append("Vary", "Accept-Encoding");
    return compressed;
  });
});
