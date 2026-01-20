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
import CodeBlock from "@/components/CodeBlock";
import { AnchorHTMLAttributes, HTMLAttributes, ImgHTMLAttributes } from "react";

/**
 * Mapping of markdown elements to Material UI components.
 * Used by ReactMarkdown's `components` prop.
 */
const MarkdownComponents: Components = {
    // Code
    code: CodeBlock,

    // Heading
    h1: ({ children }: HTMLAttributes<HTMLHeadingElement>) => (
        <Typography variant="h3" gutterBottom>
            {children}
        </Typography>
    ),
    h2: ({ children }: HTMLAttributes<HTMLHeadingElement>) => (
        <Typography variant="h4" gutterBottom>
            {children}
        </Typography>
    ),
    h3: ({ children }: HTMLAttributes<HTMLHeadingElement>) => (
        <Typography variant="h5" gutterBottom>
            {children}
        </Typography>
    ),
    h4: ({ children }: HTMLAttributes<HTMLHeadingElement>) => (
        <Typography variant="h6" gutterBottom>
            {children}
        </Typography>
    ),
    h5: ({ children }: HTMLAttributes<HTMLHeadingElement>) => (
        <Typography variant="subtitle1" gutterBottom>
            {children}
        </Typography>
    ),
    h6: ({ children }: HTMLAttributes<HTMLHeadingElement>) => (
        <Typography variant="subtitle2" gutterBottom>
            {children}
        </Typography>
    ),

    // Paragraph
    p: ({ children }: HTMLAttributes<HTMLParagraphElement>) => (
        <Typography variant="subtitle1">{children}</Typography>
    ),

    // Link
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
    ul: ({ children }: HTMLAttributes<HTMLUListElement>) => (
        <ListItem>
            <ListItemText>{children}</ListItemText>
        </ListItem>
    ),
    ol: ({ children }: HTMLAttributes<HTMLOListElement>) => (
        <List component="ol">{children}</List>
    ),
    li: ({ children }: HTMLAttributes<HTMLLIElement>) => (
        <List>{children}</List>
    ),

    // Blockquote
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
    hr: () => <Divider sx={{ borderColor: "#ccc", margin: "16px 0" }} />,

    // Image
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
    table: ({ children }: HTMLAttributes<HTMLTableElement>) => (
        <TableContainer component={Paper}>
            <Table stickyHeader sx={{ minWidth: 650 }}>
                {children}
            </Table>
        </TableContainer>
    ),
    thead: ({ children }: HTMLAttributes<HTMLTableSectionElement>) => (
        <TableHead>{children}</TableHead>
    ),
    tbody: ({ children }: HTMLAttributes<HTMLTableSectionElement>) => (
        <TableBody>{children}</TableBody>
    ),
    tr: ({ children }: HTMLAttributes<HTMLTableRowElement>) => (
        <TableRow>{children}</TableRow>
    ),
    th: ({ children }: HTMLAttributes<HTMLTableCellElement>) => (
        <TableCell>{children}</TableCell>
    ),
    td: ({ children }: HTMLAttributes<HTMLTableCellElement>) => (
        <TableCell>{children}</TableCell>
    ),

    del: ({
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        node,
        ...props
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }: HTMLAttributes<HTMLModElement> & { node?: any }) => (
        <del {...props}></del>
    ),
};

export default MarkdownComponents;
