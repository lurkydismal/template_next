import { getSessionData } from "@/lib/auth";
import { unauthorized } from "next/navigation";

export default async function Template({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const user = await getSessionData();

    if (!user) {
        unauthorized();
    }

    return children;
}
