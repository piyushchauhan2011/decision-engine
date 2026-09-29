import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { listDestinations, listHomeCatalog } from "../src/db/catalog.server";

const directory = mkdtempSync(join(tmpdir(), "hotel-catalog-"));
const previous = process.env.DB_FILE_NAME;
beforeAll(() => {
  process.env.DB_FILE_NAME = join(directory, "catalog.sqlite");
  const env = { ...process.env };
  execFileSync("pnpm", ["db:migrate"], { env, stdio: "pipe" });
  execFileSync("pnpm", ["db:seed"], { env, stdio: "pipe" });
});
afterAll(() => {
  if (previous === undefined) delete process.env.DB_FILE_NAME;
  else process.env.DB_FILE_NAME = previous;
  rmSync(directory, { recursive: true, force: true });
});

it("reads sorted migrated catalog, exact slug and an empty unknown destination", () => {
  expect(listHomeCatalog().destinations.map((destination) => destination.name)).toEqual([
    "Amalfi Coast",
    "Bali",
    "Bengaluru",
    "Cape Town",
    "Kyoto",
    "The Cyclades",
  ]);
  expect(listHomeCatalog().hotels.map((hotel) => hotel.name)).toEqual([
    "Casa Aurelia",
    "Hikari House",
    "Uma Verde",
  ]);
  expect(listDestinations().map((destination) => destination.name)).toEqual([
    "Amalfi Coast",
    "Bali",
    "Bengaluru",
    "Cape Town",
    "Kyoto",
    "The Cyclades",
    "Yucatán",
  ]);
  expect(listDestinations("kyoto").map((destination) => destination.id)).toEqual(["dest-kyoto"]);
  expect(listDestinations("kyot")).toEqual([]);
});
