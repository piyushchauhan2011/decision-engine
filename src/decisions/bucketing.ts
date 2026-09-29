import type { Variant } from "./types";

/** FNV-1a over UTF-16 code units (not UTF-8 bytes), with 32-bit unsigned overflow. */
export function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index++) {
    hash = Math.imul(hash ^ input.charCodeAt(index), 0x01000193);
  }
  return hash >>> 0;
}

export function bucketForExperiment(visitorId: string, experimentId: string): number {
  return fnv1a32(`${visitorId}:${experimentId}`) % 100;
}

export function assignVariant(visitorId: string, experimentId: string): Variant {
  return bucketForExperiment(visitorId, experimentId) < 50 ? "control" : "treatment";
}
