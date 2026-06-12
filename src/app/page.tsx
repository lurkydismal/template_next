import { afterLoginRoute } from "@/data/routes";
import { redirect } from "next/navigation";

/**
 * Root page handler that redirects users to default route.
 */
export default async function Page() {
    redirect(afterLoginRoute);
}
