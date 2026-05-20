import { afterLoginRoute } from "@/data/routes";
import { getSessionData } from "@/lib/auth";
import { permanentRedirect, redirect } from "next/navigation";

/**
 * Root page handler that redirects users based on authentication state.
 * Unauthenticated users are sent to registration; authenticated users to their default route.
 */
export default async function Page() {
    const user = await getSessionData();

    if (!user) {
        permanentRedirect("/auth/register");
    }

    redirect(afterLoginRoute);
}
