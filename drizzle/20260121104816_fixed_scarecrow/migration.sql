-- Functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tables
CREATE TABLE "table" (
	"id" serial PRIMARY KEY,
	"content" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Register triggers
CREATE TRIGGER update_table_updated_at
BEFORE UPDATE ON "table"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
