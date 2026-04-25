import React, { ComponentProps } from "react";
import { buildYear, githubUrl } from "@/utils/stdvar";
import {
    TypographyProps,
    Theme,
    Typography,
    SxProps,
    LinkProps as MuiLinkProps,
} from "@mui/material";
import { Link } from "./Link";

type GitHubLinkComposedProps = ComponentProps<typeof Link>;

type GitHubLinkProps = MuiLinkProps & {
    href: GitHubLinkComposedProps["href"];
};

function GitHubLink({ href, ...props }: Readonly<GitHubLinkProps>) {
    return (
        <Link
            {...props}
            href={href}
            color="inherit" // inherit from parent typography (guarantees visibility if parent is readable)
            display="inline-block"
            sx={{
                textDecoration: "none",
                transition:
                    "color 120ms ease, text-decoration-color 120ms ease",
                "&:hover": {
                    textDecoration: "underline",
                },
            }}
        />
    );
}

type Props = TypographyProps & {
    href?: string;
    openInNewTab?: boolean;
    label?: React.ReactNode;
    centered?: boolean;
    sx?: SxProps<Theme>;
};

function CopyrightBase({
    href = githubUrl,
    openInNewTab = true,
    label = "LurkyDismal",
    centered = false,
    sx,
    ...typographyProps
}: Props) {
    const target = openInNewTab ? "_blank" : undefined;
    const rel = openInNewTab ? "noopener noreferrer" : undefined;

    const mergedSx: SxProps<Theme> =
        typeof sx === "function"
            ? (theme) => ({ color: theme.palette.text.secondary, ...sx(theme) }) // use text.secondary for contrast
            : { color: "text.secondary", ...(sx ?? {}) };

    return (
        <Typography
            variant="body2"
            align={centered ? "center" : typographyProps.align}
            sx={mergedSx}
            {...typographyProps}
        >
            {"Copyright © "}
            <GitHubLink href={href} target={target} rel={rel} underline="none">
                {label}
            </GitHubLink>
            {` ${buildYear}.`}
        </Typography>
    );
}

export function CopyrightAligned(props: Omit<Props, "centered">) {
    return <CopyrightBase {...props} centered />;
}

export function Copyright(props: Props) {
    return <CopyrightBase {...props} />;
}
