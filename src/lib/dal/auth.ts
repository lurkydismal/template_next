import "server-only";
import { headers } from "next/headers";
import { unauthorized } from "next/navigation";
import { cache } from "react";

import auth from "@/lib/auth";

export const getSession = cache(async () => {
    return auth.api.getSession({
        headers: await headers(),
    });
});

export async function getSessionDataOrUnauthorized() {
    const session = await getSession();

    if (!session) {
        unauthorized();
    }

    return session;
}
