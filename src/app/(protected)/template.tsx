import { getSessionDataOrUnauthorized } from "@/lib/auth2";

/**
 * Renders the protected route template wrapper.
 */
export default async function Template({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    await getSessionDataOrUnauthorized();

    return children;
}
