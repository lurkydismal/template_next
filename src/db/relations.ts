import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
    tables: {
        author: r.one.users({
            from: r.tables.author_id,
            to: r.users.id,
        }),
        last_editor: r.one.users({
            from: r.tables.last_editor_id,
            to: r.users.id,
        }),
    },
    user: {
        sessions: r.many.session(),
        accounts: r.many.account(),
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
