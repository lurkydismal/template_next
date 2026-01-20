/**
 * Markdown Component
 *
 * Renders Markdown content as React components using Material UI for styling.
 *
 * Features:
 * - GitHub Flavored Markdown (tables, strikethrough, task lists) via `remark-gfm`
 * - LaTeX math rendering via `remark-math` and `rehype-katex`
 * - Custom styled headings, paragraphs, links, lists, blockquotes, images, tables
 * - Code blocks rendered via a custom `CodeBlock` component
 * - Safe external links opening in a new tab with `noopener noreferrer`
 * - Responsive images with Material UI `CardMedia`
 *
 * Notes / TODO:
 * - List handling (`ul`/`ol`/`li`) may need refinement for proper nesting
 * - Links could be sanitized further to prevent unsafe URLs
 */

import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGFM from "remark-gfm";
import remarkMath from "remark-math";
import { Box } from "@mui/material";
import MarkdownComponents from "./MarkdownComponents";

/**
 * Markdown component
 *
 * Renders markdown content using ReactMarkdown with Material UI components.
 * Supports:
 *  - GitHub Flavored Markdown (tables, task lists, strikethrough)
 *  - LaTeX math via remark-math and rehype-katex
 *  - Custom styled headings, paragraphs, lists, tables, blockquotes, links, images
 *
 * @param children - Markdown string content
 */
export default function Markdown({ children }: { children: string }) {
    return (
        <Box
            sx={{
                typography: "subtitle1",
                "& math": {
                    fontSize: "1.8rem",
                },
            }}
        >
            <ReactMarkdown
                remarkPlugins={[remarkGFM, remarkMath]}
                rehypePlugins={[[rehypeKatex, { output: "mathml" }]]}
                components={{ ...MarkdownComponents }}
            >
                {children}
            </ReactMarkdown>
        </Box>
    );
}
