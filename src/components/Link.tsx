"use client";

// This file exists solely to mark Next.js `Link` as a Client Component,
// allowing it to be passed safely to MUI components (e.g. via `component={Link}`)

import NextLink, { LinkProps } from "next/link";
import { Link as MuiLink, LinkProps as MuiLinkProps } from "@mui/material";
import { ComponentProps } from "react";

export type { LinkProps };
export default NextLink;

type NextLinkComposedProps = ComponentProps<typeof NextLink>;

type NextLinkProps = MuiLinkProps & {
    href: NextLinkComposedProps["href"];
};

export function Link({ href, children, ...props }: Readonly<NextLinkProps>) {
    return (
        <MuiLink {...props} href={href} component={NextLink}>
            {children}
        </MuiLink>
    );
}
