# template_next - Configurable Dashboard Engine

> A work-in-progress dashboard engine built with Next.js and TypeScript that provides reusable, strongly typed data grids and dynamic forms for managing different database tables through configuration.

## Table of Contents

- [General Info](#general-information)
- [Technologies Used](#technologies-used)
- [Features](#features)
- [Screenshots](#screenshots)
- [Usage](#usage)
- [Project Status](#project-status)
- [Room for Improvement](#room-for-improvement)
- [License](#license)

## General Information

- This project aims to simplify the development of database-backed dashboards by providing reusable components that can adapt to different tables and data models. Instead of building a separate interface for every table, developers can define field configurations and provide server actions to customize data operations and behavior.

- The application includes authentication, database integration, and a containerized development environment.

## Technologies Used

- Frontend: Next.js, React, TypeScript, Material UI (MUI), MUI X Data Grid
- Database: PostgreSQL, Drizzle ORM
- Validation: Zod
- Authentication: Better Auth
- Infrastructure: Docker, Caddy (or nginx)
- Data Updates: Server-Sent Events (SSE)

## Features

- Configurable data grids: Build reusable tables with strongly typed field configurations and pluggable server actions.
- Dynamic forms: Generate forms from field configurations, supporting text, numeric, date/time, Markdown, autocomplete, Boolean, and custom field types.
- Validation and field dependencies: Apply schema-aware validation and support fields whose values depend on other fields.
- CRUD operations: Integrate database-backed operations for creating, reading, updating, and deleting records.
- Table customization: Provide search, configurable columns, custom cell rendering, CSV export, and printing.
- Live data updates: Use Server-Sent Events (SSE) to refresh data.
- Authentication: Protect application features with user authentication.
- Containerized environment: Use Docker to run the application and its supporting services, including PostgreSQL, and Caddy (or nginx).

## Screenshots

![Gameplay screenshot](./screenshots/1.jpg)

## Setup

### Prerequisites

Install the following tools:

- Node.js
- pnpm
- Docker with the Docker Compose plugin

### 1. Clone the repository

```bash
git clone https://github.com/lurkydismal/template_next.git
cd template_next
```

### 2. Configure environment variables

Create a local environment file:

```bash
cp env.example .env
```

Review `.env` and configure your database, authentication, and object storage settings.

For local development, make sure the database settings use the host machine's address:

```dotenv
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=appdb
DB_HOST=localhost
DB_PORT=5432
```

Set a strong, random `JWT_SECRET` and configure `JWT_EXPIRES_IN` and `COOKIE_SECURE` appropriately for your environment. Do not use example credentials or a placeholder secret in production.

### 3. Install dependencies

```bash
pnpm install
```

### 4. Start the database and object storage

Start PostgreSQL using Docker Compose:

```bash
docker compose up -d postgres
```

PostgreSQL is exposed on port `5432`.

### 5. Initialize the database schema

With PostgreSQL running and the database variables configured, synchronize the database schema with the current Drizzle definitions:

```bash
pnpm push
```

This command uses Drizzle Kit to apply the schema to the configured database. Use it for initial local setup; review schema changes carefully when working with an existing database.

### 6. Start the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

**Note:** The Docker Compose files also include an application container and a Caddy reverse proxy. The complete containerized deployment may require additional environment and networking configuration; the steps above describe local development with PostgreSQL running in containers.

## Usage

### 1. Create an account

Open `/auth/register` to create an account. Once registered, sign in at `/auth/login`.

The application protects its dashboard routes and uses a JWT stored in an HttpOnly cookie to identify authenticated sessions.

### 2. Open the dashboard

After signing in, navigate to `/dashboard/tables`. The root route redirects to the application's configured default route.

The included dashboard demonstrates the reusable data-grid and form components using a sample database table.

### 3. Manage records

From the table dashboard, you can use the available controls to:

- Search records using the quick filter.
- Customize visible columns and access filtering controls.
- Create records and edit their fields through the configured form interface.
- Use field-specific inputs, validation, and dependent-field behavior.
- Export data to CSV or print the table.

Available fields and actions depend on the dashboard configuration.

### 4. Customize the dashboard for another table

The dashboard is designed to be adapted to different database tables rather than requiring a completely separate interface for each one.

To add or customize a dashboard:

1. **Define the data model** in `src/db/schema.ts` and update the corresponding database types.
2. **Configure the fields** using the `FieldConfig` definitions in `src/data/dashboard/tables/fields.tsx`. Specify field types, labels, validation rules, default values, layout, and any custom rendering or dependencies.
3. **Provide server actions** using the reusable operations in `src/lib/dashboard/common/function.ts`. Create table-specific wrappers to select the appropriate database table and identifier.
4. **Connect the configuration** to `TableDataGrid` from the relevant dashboard page, passing the field definitions and server actions.
5. **Synchronize the schema** with PostgreSQL and verify that the form and table behave as expected.

This approach keeps table-specific configuration separate from the shared components responsible for rendering the grid, handling forms, and communicating with server actions.

## Development Commands

Run these commands from the project root.

| Command                  | Description                                                  |
| ------------------------ | ------------------------------------------------------------ |
| `pnpm dev`               | Start the Next.js development server.                        |
| `pnpm build`             | Build the production application.                            |
| `pnpm start`             | Start the production server after building.                  |
| `pnpm test --run`        | Run the Vitest test suite once.                              |
| `pnpm format`            | Format project files using Oxfmt.                            |
| `pnpm format:check`      | Check formatting without applying changes.                   |
| `pnpm lint`              | Run Fallow static analysis.                                  |
| `pnpm exec tsc --noEmit` | Run TypeScript type checking.                                |
| `pnpm generate`          | Generate database migrations from schema changes.            |
| `pnpm migrate`           | Apply pending Drizzle migrations.                            |
| `pnpm push`              | Synchronize the schema with the database.                    |
| `pnpm pull`              | Pull the database schema into the Drizzle schema definition. |

Playwright end-to-end tests are configured in `playwright.config.ts`. To install the required Chromium binaries and run the Chromium tests:

```bash
pnpm exec playwright install chromium chromium-headless-shell
pnpm exec playwright test --project=chromium
```

## Project Status

Project is: _in progress_.

The project currently provides reusable grid and form components, database integration, authentication, and a sample dashboard. Its configuration API, test coverage, documentation, and deployment setup can be further developed.

## Room for Improvement

- Complete the implementation: Finish unfinished features and refine the configuration API as the project evolves.
- Expand customization: Support more field types, validation options, and reusable table and form behaviors.
- Improve testing: Add unit, integration, and end-to-end tests for form handling, validation, CRUD operations, and live updates.
- Strengthen production readiness: Review authentication, authorization, error handling, logging, and rate limiting for deployment scenarios.
- Improve documentation: Add setup instructions, configuration examples, API documentation, and examples of building dashboards for different database schemas.
- Refine deployment: Document production deployment, persistent storage, environment configuration, backups, and service monitoring.

## License

This project is open source and available under the [GNU Affero General Public License v3.0](LICENSE).
