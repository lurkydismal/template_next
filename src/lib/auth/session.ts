import { headers } from "next/headers";

import auth from "@/lib/auth";

/** Reads the current request session in a Server Component or Server Action. */
export async function getCurrentSession() {
    return auth.api.getSession({ headers: await headers() });
}

/** Reads the session associated with a Route Handler request. */
export async function getRequestSession(request: Request) {
    return auth.api.getSession({ headers: request.headers });
}
