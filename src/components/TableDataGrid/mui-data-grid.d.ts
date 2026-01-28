import type { GridToolbarProps } from "@mui/x-data-grid";

declare module "@mui/x-data-grid" {
    interface ToolbarPropsOverrides {
        extraButtons?: React.ReactNode;
    }
}
