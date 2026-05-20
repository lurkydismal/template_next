import { FileDownload as FileDownloadIcon } from "@mui/icons-material";
import { Menu, MenuItem, Tooltip } from "@mui/material";
import { ExportCsv, ExportPrint, ToolbarButton } from "@mui/x-data-grid";
import { MouseEvent, useId, useState } from "react";

/**
 * Renders the export menu component.
 */
export default function ExportMenu() {
    const exportMenuId = useId();
    const exportMenuTriggerId = `${exportMenuId}-trigger`;
    const [exportMenuAnchorEl, setExportMenuAnchorEl] =
        useState<HTMLElement | null>(null);
    const exportMenuOpen = Boolean(exportMenuAnchorEl);

    /**
     * Handles export menu open.
     */
    const handleExportMenuOpen = (event: MouseEvent<HTMLElement>) => {
        setExportMenuAnchorEl(event.currentTarget);
    };

    /**
     * Handles export menu close.
     */
    const handleExportMenuClose = () => {
        setExportMenuAnchorEl(null);
    };

    return (
        <>
            <Tooltip title="Export">
                <ToolbarButton
                    id={exportMenuTriggerId}
                    aria-controls={exportMenuOpen ? exportMenuId : undefined}
                    aria-haspopup="true"
                    aria-expanded={exportMenuOpen ? "true" : undefined}
                    onClick={handleExportMenuOpen}
                >
                    <FileDownloadIcon fontSize="small" />
                </ToolbarButton>
            </Tooltip>

            <Menu
                id={exportMenuId}
                anchorEl={exportMenuAnchorEl}
                open={exportMenuOpen}
                onClose={handleExportMenuClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                slotProps={{
                    list: {
                        "aria-labelledby": exportMenuTriggerId,
                    },
                }}
            >
                <ExportPrint
                    render={<MenuItem />}
                    onClick={handleExportMenuClose}
                >
                    Print
                </ExportPrint>
                <ExportCsv
                    render={<MenuItem />}
                    onClick={handleExportMenuClose}
                >
                    Download as CSV
                </ExportCsv>
            </Menu>
        </>
    );
}
