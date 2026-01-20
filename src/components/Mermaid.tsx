import uuid from "@/utils/uuid";
import mermaid from "mermaid";
import Container from "@mui/material/Container";
import { useTheme } from "@mui/material/styles";
import { useEffect, useRef } from "react";

// React component that renders a Mermaid chart
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
            .catch((err) => {
                // On error, display the error message in red inside a <pre> tag
                container.current!.innerHTML = `<pre style="color:red;">${
                    err instanceof Error ? err.message : String(err)
                }</pre>`;
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
