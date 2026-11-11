import { defineRelations } from "drizzle-orm";

import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
    tables: {
        author: r.one.user({
            from: r.tables.author_id,
            to: r.user.id,
        }),
        last_editor: r.one.user({
            from: r.tables.last_editor_id,
            to: r.user.id,
        }),
    },
    user: {
        sessions: r.many.session(),
        accounts: r.many.account(),
        recordChanges: r.many.recordChanges(),
    },
    recordChanges: {
        actor: r.one.user({
            from: r.recordChanges.actor_id,
            to: r.user.id,
        }),
    },
    session: {
        user: r.one.user({
            from: r.session.userId,
            to: r.user.id,
        }),
    },
    account: {
        user: r.one.user({
            from: r.account.userId,
            to: r.user.id,
        }),
    },
}));
