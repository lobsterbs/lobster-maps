CREATE TABLE IF NOT EXISTS "overpass_query_cache" (
	"cell_col" integer NOT NULL,
	"cell_row" integer NOT NULL,
	"queried_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "overpass_query_cache_cell_col_cell_row_pk" PRIMARY KEY("cell_col","cell_row")
);
