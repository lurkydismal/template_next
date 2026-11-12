import { NextRequest, NextResponse } from "next/server";

import auth from "@/lib/auth";
import { authConfig } from "@/lib/auth/config";

export async function proxy(request: NextRequest) {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
        const entry = authConfig.signUpDisabled ? "/auth/login" : "/auth/register";
        return NextResponse.redirect(new URL(entry, request.url));
    }

    return NextResponse.next();
}

export const config = {
    // API routes authenticate themselves (see guardRoute) and health probes must stay public.
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico|auth).*)"],
};
