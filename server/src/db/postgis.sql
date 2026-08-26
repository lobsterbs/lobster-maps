-- Run once against the same database, after `npm run db:migrate`.
--
-- This adds PostGIS-backed spatial indexing on top of the lat/lng
-- columns Drizzle owns. Kept as plain SQL because Postgres generated
-- columns aren't something drizzle-kit's schema DSL expresses —
-- faking it through the ORM would be less reliable than just writing
-- the SQL Postgres actually wants here.

CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS geog geography(Point, 4326)
  GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography) STORED;

CREATE INDEX IF NOT EXISTS businesses_geog_gist_idx ON businesses USING GIST (geog);
