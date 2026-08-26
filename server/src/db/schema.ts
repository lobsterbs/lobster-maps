import { pgTable, uuid, text, doublePrecision, timestamp, boolean, jsonb, index } from 'drizzle-orm/pg-core';

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
    verified: boolean('verified').default(false).notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    categoryIdx: index('businesses_category_idx').on(table.category),
  })
);

export type Business = typeof businesses.$inferSelect;
export type NewBusiness = typeof businesses.$inferInsert;
