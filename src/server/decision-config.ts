import { definePlugin } from "nitro";
import { rolloutConfig } from "../decisions/rollout.server";

export default definePlugin(() => {
  // Keep the configuration read in startup, not in the first request handler.
  if (!rolloutConfig.disabledIds) throw new Error("Decision rollout configuration unavailable");
});
