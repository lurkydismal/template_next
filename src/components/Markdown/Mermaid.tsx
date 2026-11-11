import Container from "@mui/material/Container";
import { useTheme } from "@mui/material/styles";
import mermaid from "mermaid";
import { useEffect, useRef } from "react";

import { userMessages } from "@/utils/messages";
import log from "@/utils/stdlog";
import uuid from "@/utils/uuid";

// React component that renders a Mermaid chart
/**
 * Renders the mermaid component.
 */
export default function Mermaid({ chart }: { chart: string }) {
    // Access the current theme (light/dark) from Material UI
    const theme = useTheme();

    // Ref to the container div where Mermaid SVG will be injected
    const container = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!container.current) return;

        // Initialize Mermaid with theme based on MUI mode
        mermaid.initialize({
            startOnLoad: false, // Disable automatic rendering on page load; we'll render manually
            theme: theme.palette.mode === "dark" ? "dark" : "default",
        });

        // Generate a unique ID for the Mermaid chart to avoid conflicts
        const id = "mermaid-" + uuid();

        mermaid
            .render(id, chart)
            .then((result) => {
                // On successful render, insert the SVG into the container
                container.current!.innerHTML = result.svg;
            })
            .catch((error: unknown) => {
                log.error("Mermaid chart rendering failed", error);
                const message = document.createElement("pre");
                message.style.color = "var(--mui-palette-error-main, #d32f2f)";
                message.textContent = userMessages.errors.diagramRender;
                container.current?.replaceChildren(message);
            });
    }, [chart, theme]);

    return (
        <Container
            sx={{
                zoom: "90%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                width: "100%",
                height: "100%",
            }}
            ref={container}
        />
    );
}
