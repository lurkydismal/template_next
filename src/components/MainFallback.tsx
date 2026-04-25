"use client";

import { styled, Box, Typography, keyframes } from "@mui/material";
import { ReactNode, Children } from "react";

type Props = {
    children?: ReactNode;
    /** string or node to show when empty */
    message?: ReactNode;
    /** optionally pass a numeric count (e.g. array.length) to consider non-empty */
    itemsLength?: number | null;
    className?: string;
};

const Root = styled(Box)(({ theme }) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    minHeight: 0, // important when used inside flex column with overflow
    padding: theme.spacing(4),
    position: "relative",
    background: "transparent",
}));

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulseGlow = keyframes`
  0%,100% { text-shadow: 0 6px 18px rgba(255,255,255,0.06), 0 12px 40px rgba(0,0,0,0.6); }
  50% { text-shadow: 0 10px 30px rgba(255,255,255,0.10), 0 18px 50px rgba(0,0,0,0.6); }
`;

const Fancy = styled(Typography)(({ theme }) => ({
    position: "relative",
    fontWeight: theme.typography.fontWeightMedium,
    fontSize: "clamp(20px, 6vw, 64px)",
    lineHeight: 1,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    textAlign: "center",
    color: "#fff",
    background:
        "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(250,250,250,0.98) 50%, rgba(245,245,245,0.96) 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    animation: `${fadeInUp} 600ms ease both, ${pulseGlow} 2.8s ease-in-out infinite`,
    "&::before": {
        content: '""',
        position: "absolute",
        inset: 0,
        zIndex: -1,
        filter: "blur(20px)",
        background: "white",
        opacity: 0.15,
        borderRadius: "inherit",
    },
}));

function isEmptyNode(node?: ReactNode) {
    if (node === null || node === undefined) return true;
    if (typeof node === "string") return node.trim() === "";
    if (Array.isArray(node)) {
        // any non-empty child counts as non-empty
        return node.every(isEmptyNode);
    }
    // React element or object assumed non-empty
    return false;
}

export default function MainFallback({
    children,
    message = "No content yet",
    itemsLength,
    className,
}: Props) {
    const childrenEmpty =
        isEmptyNode(children) && Children.count(children) === 0;
    const countEmpty =
        itemsLength !== undefined && itemsLength !== null
            ? itemsLength === 0
            : true;
    const showFallback =
        childrenEmpty || (itemsLength === undefined ? true : countEmpty);

    if (!showFallback) {
        return (
            <Root
                className={className}
                sx={{
                    width: "100%",
                    flexGrow: 1,
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <Box
                    sx={{
                        width: "100%",
                        flexGrow: 1,
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    {children}
                </Box>
            </Root>
        );
    }

    return (
        <Root className={className} role="status" aria-live="polite">
            <Fancy as="div">{message}</Fancy>
        </Root>
    );
}
