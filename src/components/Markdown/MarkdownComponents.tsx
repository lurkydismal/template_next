import { Components } from "react-markdown";
import {
    Typography,
    TableRow,
    TableHead,
    TableContainer,
    TableCell,
    TableBody,
    Table,
    Paper,
    ListItemText,
    ListItem,
    List,
    Link,
    Divider,
    Container,
    CardMedia,
} from "@mui/material";
import CodeBlock from "./CodeBlock";
import { AnchorHTMLAttributes, HTMLAttributes, ImgHTMLAttributes } from "react";

/**
 * Mapping of markdown elements to Material UI components.
 * Used by ReactMarkdown's `components` prop.
 */
const MarkdownComponents: Components = {
    // Code
    code: CodeBlock,

    // Heading
    /**
     * Renders a styled first-level Markdown heading.
     */
    h1: ({ children }: HTMLAttributes<HTMLHeadingElement>) => (
        <Typography variant="h3" gutterBottom>
            {children}
        </Typography>
    ),
    /**
     * Renders a styled second-level Markdown heading.
     */
    h2: ({ children }: HTMLAttributes<HTMLHeadingElement>) => (
        <Typography variant="h4" gutterBottom>
            {children}
        </Typography>
    ),
    /**
     * Renders a styled third-level Markdown heading.
     */
    h3: ({ children }: HTMLAttributes<HTMLHeadingElement>) => (
        <Typography variant="h5" gutterBottom>
            {children}
        </Typography>
    ),
    /**
     * Renders a styled fourth-level Markdown heading.
     */
    h4: ({ children }: HTMLAttributes<HTMLHeadingElement>) => (
        <Typography variant="h6" gutterBottom>
            {children}
        </Typography>
    ),
    /**
     * Renders a styled fifth-level Markdown heading.
     */
    h5: ({ children }: HTMLAttributes<HTMLHeadingElement>) => (
        <Typography variant="subtitle1" gutterBottom>
            {children}
        </Typography>
    ),
    /**
     * Renders a styled sixth-level Markdown heading.
     */
    h6: ({ children }: HTMLAttributes<HTMLHeadingElement>) => (
        <Typography variant="subtitle2" gutterBottom>
            {children}
        </Typography>
    ),

    // Paragraph
    /**
     * Renders a styled Markdown paragraph.
     */
    p: ({ children }: HTMLAttributes<HTMLParagraphElement>) => (
        <Typography variant="subtitle1">{children}</Typography>
    ),

    // Link
    /**
     * Renders a Markdown link with project link behavior.
     */
    a: ({ href, children }: AnchorHTMLAttributes<HTMLAnchorElement>) => {
        const safeHref =
            href?.startsWith("http") || href?.startsWith("/") ? href : "#";

        return (
            <Link
                href={safeHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="(opens in new tab)"
            >
                {children}
            </Link>
        );
    },

    // Lists
    /**
     * Renders a styled unordered Markdown list.
     */
    ul: ({ children }: HTMLAttributes<HTMLUListElement>) => (
        <ListItem>
            <ListItemText>{children}</ListItemText>
        </ListItem>
    ),
    /**
     * Renders a styled ordered Markdown list.
     */
    ol: ({ children }: HTMLAttributes<HTMLOListElement>) => (
        <List component="ol">{children}</List>
    ),
    /**
     * Renders a styled Markdown list item.
     */
    li: ({ children }: HTMLAttributes<HTMLLIElement>) => (
        <List>{children}</List>
    ),

    // Blockquote
    /**
     * Renders a styled Markdown blockquote.
     */
    blockquote: ({ children }: HTMLAttributes<HTMLQuoteElement>) => (
        <Typography
            component="blockquote"
            sx={{
                borderLeft: "4px solid",
                paddingLeft: 2,
                color: "text.secondary",
                fontStyle: "italic",
            }}
        >
            {children}
        </Typography>
    ),

    // Horizontal rule
    /**
     * Renders a styled Markdown horizontal rule.
     */
    hr: () => <Divider sx={{ borderColor: "#ccc", margin: "16px 0" }} />,

    // Image
    /**
     * Renders a responsive Markdown image.
     */
    img: ({ src, alt }: ImgHTMLAttributes<HTMLImageElement>) => (
        <Container
            sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                width: "100%",
                height: "100%",
            }}
        >
            <CardMedia
                component="img"
                image={String(src)}
                alt={alt}
                sx={{
                    minWidth: "10%",
                    maxWidth: "50%",
                    borderRadius: 4,
                }}
            />
        </Container>
    ),

    // remark-gfm
    // Table
    /**
     * Renders a scrollable styled Markdown table.
     */
    table: ({ children }: HTMLAttributes<HTMLTableElement>) => (
        <TableContainer component={Paper}>
            <Table stickyHeader sx={{ minWidth: 650 }}>
                {children}
            </Table>
        </TableContainer>
    ),
    /**
     * Renders a styled Markdown table head.
     */
    thead: ({ children }: HTMLAttributes<HTMLTableSectionElement>) => (
        <TableHead>{children}</TableHead>
    ),
    /**
     * Renders a Markdown table body.
     */
    tbody: ({ children }: HTMLAttributes<HTMLTableSectionElement>) => (
        <TableBody>{children}</TableBody>
    ),
    /**
     * Renders a Markdown table row.
     */
    tr: ({ children }: HTMLAttributes<HTMLTableRowElement>) => (
        <TableRow>{children}</TableRow>
    ),
    /**
     * Renders a styled Markdown table header cell.
     */
    th: ({ children }: HTMLAttributes<HTMLTableCellElement>) => (
        <TableCell>{children}</TableCell>
    ),
    /**
     * Renders a styled Markdown table cell.
     */
    td: ({ children }: HTMLAttributes<HTMLTableCellElement>) => (
        <TableCell>{children}</TableCell>
    ),

    /**
     * Renders Markdown strikethrough text.
     */
    del: ({
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        node,
        ...props
    }: HTMLAttributes<HTMLModElement> & { node?: unknown }) => (
        <del {...props}></del>
    ),
};

export default MarkdownComponents;
