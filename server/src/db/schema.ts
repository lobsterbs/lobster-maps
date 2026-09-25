import { pgTable, uuid, text, doublePrecision, timestamp, boolean, jsonb, index, integer, primaryKey } from 'drizzle-orm/pg-core';

// latitude/longitude are the source of truth Drizzle manages directly.
// A generated PostGIS `geog` column + GIST index sits on top of these
// (see db/postgis.sql) for fast bbox/radius queries — Drizzle's schema
// DSL doesn't have first-class support for Postgres generated columns,
// so that part is plain SQL rather than forced into this file.
export const businesses = pgTable(
  'businesses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    category: text('category').notNull(),
    address: text('address').notNull(),
    latitude: doublePrecision('latitude').notNull(),
    longitude: doublePrecision('longitude').notNull(),
    phone: text('phone'),
    website: text('website'),
    hours: jsonb('hours').$type<Record<string, string>>(),
    imageUrls: text('image_urls').array().$type<string[]>(),
    verified: boolean('verified').default(false).notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    categoryIdx: index('businesses_category_idx').on(table.category),
  })
);

export type Business = typeof businesses.$inferSelect;
export type NewBusiness = typeof businesses.$inferInsert;

export const locations = pgTable(
  'locations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    latitude: doublePrecision('latitude').notNull(),
    longitude: doublePrecision('longitude').notNull(),
    verified: boolean('verified').default(false).notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
  }
);

export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;

export const issues = pgTable(
  'issues',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    type: text('type').notNull(), // Road damage, Blocked path, Missing data, Business info wrong, Other
    description: text('description').notNull(),
    latitude: doublePrecision('latitude').notNull(),
    longitude: doublePrecision('longitude').notNull(),
    resolved: boolean('resolved').default(false).notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
  }
);

export type Issue = typeof issues.$inferSelect;
export type NewIssue = typeof issues.$inferInsert;

// Tracks which coarse grid cells (see server/src/lib/liveOverpass.ts)
// have recently had a live Overpass query run for them, so panning
// around the same neighborhood doesn't trigger a fresh Overpass call
// on every single map move — Overpass's public instance is a shared,
// free resource. cellCol/cellRow together are the primary key, one
// row per grid cell, upserted with a fresh timestamp on each query.
export const overpassQueryCache = pgTable(
  'overpass_query_cache',
  {
    cellCol: integer('cell_col').notNull(),
    cellRow: integer('cell_row').notNull(),
    queriedAt: timestamp('queried_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.cellCol, table.cellRow] }),
  })
);
