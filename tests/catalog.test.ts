import { execFileSync } from "node:child_process";
import Database from "better-sqlite3";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { listDestinations, listHomeCatalog } from "../src/db/catalog.server";
import type { Result } from "neverthrow";
import type { CatalogError } from "../src/db/catalog.server";

function value<T>(result: Result<T, CatalogError>): T {
  return result.match(
    (item) => item,
    (error) => {
      throw error;
    },
  );
}

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
  expect(value(listHomeCatalog()).destinations.map((destination) => destination.name)).toEqual([
    "Amalfi Coast",
    "Bali",
    "Bengaluru",
    "Cape Town",
    "Kyoto",
    "The Cyclades",
  ]);
  expect(value(listHomeCatalog()).hotels.map((hotel) => hotel.name)).toEqual([
    "Casa Aurelia",
    "Hikari House",
    "Uma Verde",
  ]);
  expect(value(listDestinations()).map((destination) => destination.name)).toEqual([
    "Amalfi Coast",
    "Bali",
    "Bengaluru",
    "Cape Town",
    "Kyoto",
    "The Cyclades",
    "Yucatán",
  ]);
  expect(value(listDestinations("kyoto")).map((destination) => destination.id)).toEqual([
    "dest-kyoto",
  ]);
  expect(value(listDestinations("kyot"))).toEqual([]);
});

it("classifies setup failures separately from broken catalog files", () => {
  const seeded = process.env.DB_FILE_NAME;
  try {
    process.env.DB_FILE_NAME = join(directory, "missing.sqlite");
    const missing = listHomeCatalog();
    expect(missing.isErr()).toBe(true);
    if (missing.isErr()) {
      expect(missing.error.kind).toBe("setup-required");
      expect(missing.error.message).toContain("pnpm db:setup");
    }

    process.env.DB_FILE_NAME = join(directory, "unmigrated.sqlite");
    new Database(process.env.DB_FILE_NAME).close();
    const unmigrated = listDestinations();
    expect(unmigrated.isErr()).toBe(true);
    if (unmigrated.isErr()) expect(unmigrated.error.kind).toBe("setup-required");

    process.env.DB_FILE_NAME = join(directory, "unseeded.sqlite");
    execFileSync("pnpm", ["db:migrate"], { env: { ...process.env }, stdio: "pipe" });
    const unseeded = listDestinations("kyoto");
    expect(unseeded.isErr()).toBe(true);
    if (unseeded.isErr()) expect(unseeded.error.kind).toBe("setup-required");

    process.env.DB_FILE_NAME = join(directory, "corrupt.sqlite");
    writeFileSync(process.env.DB_FILE_NAME, "not a database");
    const corrupt = listHomeCatalog();
    expect(corrupt.isErr()).toBe(true);
    if (corrupt.isErr()) {
      expect(corrupt.error.kind).toBe("query-failed");
      expect(corrupt.error.message).toMatch(/not a database/i);
    }
  } finally {
    if (seeded === undefined) delete process.env.DB_FILE_NAME;
    else process.env.DB_FILE_NAME = seeded;
  }
});
