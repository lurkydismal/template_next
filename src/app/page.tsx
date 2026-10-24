import { redirect } from "next/navigation";

import { afterLoginRoute } from "@/data/routes";

/**
 * Root page handler that redirects users to default route.
 */
export default async function Page() {
    redirect(afterLoginRoute);
}
