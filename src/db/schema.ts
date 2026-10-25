import { sql } from "drizzle-orm";
import {
    check,
    serial,
    varchar,
    text,
    index,
    boolean,
    timestamp,
    snakeCase,
} from "drizzle-orm/pg-core";

import * as templates from "./templates";

const table = snakeCase.table;

export const tables = table("tables", templates.table, (t) => [
    check("multilineField_not_blank", sql`length(trim(${t.multiline_field})) > 0`),

    index().on(t.author_id),
    index().on(t.last_editor_id),
]);

export const notifications = table(
    "notifications",
    {
        id: serial().primaryKey(),
        type: varchar({
            length: 16,
            enum: ["default", "success", "error", "warning", "info"],
        })
            .notNull()
            .default("default"),
        message: text().notNull(),
        is_read: boolean().notNull().default(false),
        read_at: timestamp({ withTimezone: true }),
        created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [
        check("notification_message_not_blank", sql`length(trim(${t.message})) > 0`),
        index().on(t.is_read),
        index().on(t.created_at),
    ],
);

// * NOTE: Better Auth
export const user = table("user", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
});

export const session = table(
    "session",
    {
        id: text("id").primaryKey(),
        expiresAt: timestamp("expires_at").notNull(),
        token: text("token").notNull().unique(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .$onUpdate(() => /* @__PURE__ */ new Date())
            .notNull(),
        ipAddress: text("ip_address"),
        userAgent: text("user_agent"),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
    },
    (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = table(
    "account",
    {
        id: text("id").primaryKey(),
        accountId: text("account_id").notNull(),
        providerId: text("provider_id").notNull(),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        accessToken: text("access_token"),
        refreshToken: text("refresh_token"),
        idToken: text("id_token"),
        accessTokenExpiresAt: timestamp("access_token_expires_at"),
        refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
        scope: text("scope"),
        password: text("password"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .$onUpdate(() => /* @__PURE__ */ new Date())
            .notNull(),
    },
    (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = table(
    "verification",
    {
        id: text("id").primaryKey(),
        identifier: text("identifier").notNull(),
        value: text("value").notNull(),
        expiresAt: timestamp("expires_at").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => /* @__PURE__ */ new Date())
            .notNull(),
    },
    (table) => [index("verification_identifier_idx").on(table.identifier)],
);
