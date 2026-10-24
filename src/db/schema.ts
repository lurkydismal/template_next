import {
    pgTable,
    check,
    serial,
    varchar,
    text,
    index,
    boolean,
    timestamp,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import * as templates from "./templates";
import { timestampsColumns } from "./helpers";

export const tables = pgTable("tables", templates.table, (t) => [
    check(
        "multilineField_not_blank",
        sql`length(trim(${t.multiline_field})) > 0`,
    ),

    index().on(t.author_id),
    index().on(t.last_editor_id),
]);

export const users = pgTable(
    "users",
    {
        id: serial().primaryKey(),
        username: varchar({ length: 32 }).unique().notNull(),
        username_normalized: varchar({ length: 32 }).unique().notNull(),
        password_hash: text().notNull(),
        ...timestampsColumns,
    },
    (t) => [
        check("username_not_blank", sql`length(trim(${t.username})) > 0`),
        check(
            "username_normalized_not_blank",
            sql`length(trim(${t.username_normalized})) > 0`,
        ),
        check(
            "username_normalized_lowercase",
            sql`${t.username_normalized} = lower(${t.username_normalized})`,
        ),
    ],
);

export const notifications = pgTable(
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
        check(
            "notification_message_not_blank",
            sql`length(trim(${t.message})) > 0`,
        ),
        index().on(t.is_read),
        index().on(t.created_at),
    ],
);

// * NOTE: Better Auth
export const user = pgTable("user", {
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

export const session = pgTable(
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

export const account = pgTable(
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

export const verification = pgTable(
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
