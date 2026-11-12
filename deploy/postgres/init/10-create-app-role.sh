#!/bin/sh
set -eu

: "${APP_DB_USER:?APP_DB_USER must be set}"
: "${MIGRATION_DB_USER:?MIGRATION_DB_USER must be set}"
: "${POSTGRES_DB:?POSTGRES_DB must be set}"

# Read passwords inside psql rather than passing their values on the process
# command line. Compose mounts each secret only into the database container.
psql \
    --username "$POSTGRES_USER" \
    --dbname "$POSTGRES_DB" \
    --set=app_user="$APP_DB_USER" \
    --set=migration_user="$MIGRATION_DB_USER" \
    --set=db_name="$POSTGRES_DB" \
    <<'SQL'
\set app_password `cat /run/secrets/app_db_password`
\set migration_password `cat /run/secrets/migration_db_password`

CREATE ROLE :"migration_user" LOGIN PASSWORD :'migration_password';
-- CREATE on the database is required because `drizzle-kit migrate` always runs
-- `CREATE SCHEMA IF NOT EXISTS public`; PostgreSQL checks this privilege before it notices
-- that the schema already exists. The role still cannot create roles or touch other databases.
GRANT CONNECT, CREATE ON DATABASE :"db_name" TO :"migration_user";
GRANT USAGE, CREATE ON SCHEMA public TO :"migration_user";
ALTER ROLE :"migration_user" SET search_path = public;

CREATE ROLE :"app_user" LOGIN PASSWORD :'app_password';
GRANT CONNECT ON DATABASE :"db_name" TO :"app_user";
GRANT USAGE ON SCHEMA public TO :"app_user";

-- Give the runtime role DML access to objects created by the migration owner.
ALTER DEFAULT PRIVILEGES FOR ROLE :"migration_user" IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"app_user";
ALTER DEFAULT PRIVILEGES FOR ROLE :"migration_user" IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO :"app_user";
SQL
