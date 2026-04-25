import { afterLoginRoute } from "@/data/routes";
import { getSessionData } from "@/lib/auth";
import { permanentRedirect } from "next/navigation";

export default async function Page() {
    const user = await getSessionData();

    if (!user) {
        permanentRedirect("/auth/register");
    }

    permanentRedirect(afterLoginRoute);
}
