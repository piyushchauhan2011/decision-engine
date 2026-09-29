import { existsSync } from "node:fs";
import Database from "better-sqlite3";
import { asc, eq, inArray, sql } from "drizzle-orm";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { destinations, hotels } from "./schema";
import type { InferSelectModel } from "drizzle-orm";

export type Destination = InferSelectModel<typeof destinations>;
export type Hotel = InferSelectModel<typeof hotels>;

const setupHint = "Catalog database is missing or empty. Run pnpm db:setup to migrate and seed it.";
const curatedHotelIds = ["hotel-1-1", "hotel-2-1", "hotel-3-1"] as const;

type CatalogDb = BetterSQLite3Database;

function withCatalog<T>(query: (db: CatalogDb) => T): T {
  const file = process.env.DB_FILE_NAME || "./local.db";
  if (!existsSync(file)) throw new Error(`${setupHint} (DB_FILE_NAME=${file})`);
  let sqlite: Database.Database | undefined;
  try {
    sqlite = new Database(file, { readonly: true, fileMustExist: true });
    return query(drizzle(sqlite));
  } catch (cause) {
    // Drizzle wraps SQLite errors; both a missing file and an unmigrated file need setup.
    const sqliteError =
      cause instanceof Error && "cause" in cause && cause.cause instanceof Error
        ? cause.cause
        : cause;
    if (
      sqliteError instanceof Error &&
      /no such table|unable to open database file/i.test(sqliteError.message)
    ) {
      throw new Error(`${setupHint} (DB_FILE_NAME=${file})`, { cause });
    }
    throw cause;
  } finally {
    sqlite?.close();
  }
}

function ensureSeeded(db: CatalogDb): void {
  if (db.select({ id: destinations.id }).from(destinations).limit(1).all().length === 0) {
    throw new Error(setupHint);
  }
}

export function listHomeCatalog(): { destinations: Destination[]; hotels: Hotel[] } {
  return withCatalog((db) => {
    const homeDestinations = db
      .select({
        id: destinations.id,
        slug: destinations.slug,
        name: destinations.name,
        country: destinations.country,
        summary: destinations.summary,
        image: destinations.image,
      })
      .from(destinations)
      .orderBy(asc(destinations.name))
      .limit(6)
      .all();
    if (homeDestinations.length === 0) throw new Error(setupHint);
    const featuredHotels = db
      .select({
        id: hotels.id,
        destinationId: hotels.destinationId,
        slug: hotels.slug,
        name: hotels.name,
        summary: hotels.summary,
        rating: hotels.rating,
        priceFrom: hotels.priceFrom,
        image: hotels.image,
      })
      .from(hotels)
      .where(inArray(hotels.id, curatedHotelIds))
      .orderBy(sql`case ${hotels.id} when 'hotel-1-1' then 0 when 'hotel-2-1' then 1 else 2 end`)
      .all();
    if (featuredHotels.length !== curatedHotelIds.length) throw new Error(setupHint);
    return { destinations: homeDestinations, hotels: featuredHotels };
  });
}

export function listDestinations(slug?: string): Destination[] {
  return withCatalog((db) => {
    const result = db
      .select({
        id: destinations.id,
        slug: destinations.slug,
        name: destinations.name,
        country: destinations.country,
        summary: destinations.summary,
        image: destinations.image,
      })
      .from(destinations)
      .where(slug === undefined ? undefined : eq(destinations.slug, slug))
      .orderBy(asc(destinations.name))
      .all();
    if (result.length === 0 && slug !== undefined) ensureSeeded(db);
    if (result.length === 0 && slug === undefined) throw new Error(setupHint);
    return result;
  });
}
