import {
    FilterList as FilterListIcon,
    ViewColumn as ViewColumnIcon,
} from "@mui/icons-material";
import { Badge, Tooltip } from "@mui/material";
import {
    ColumnsPanelTrigger,
    FilterPanelTrigger,
    ToolbarButton,
} from "@mui/x-data-grid";

/**
 * Renders the columns panel trigger button.
 */
export function ColumnsPanelButton() {
    return (
        <ColumnsPanelTrigger
            render={(triggerProps) => (
                <Tooltip title="Columns">
                    <ToolbarButton {...triggerProps}>
                        <ViewColumnIcon fontSize="small" />
                    </ToolbarButton>
                </Tooltip>
            )}
        />
    );
}

/**
 * Renders the filters panel trigger button with active filter state.
 */
export function FiltersPanelButton() {
    return (
        <FilterPanelTrigger
            render={(triggerProps, state) => (
                <Tooltip title="Filters">
                    <Badge
                        badgeContent={state.filterCount}
                        color="info"
                        overlap="circular"
                        variant="dot"
                        anchorOrigin={{
                            horizontal: "right",
                        }}
                    >
                        <ToolbarButton
                            {...triggerProps}
                            color={
                                state.filterCount > 0 ? "primary" : "default"
                            }
                        >
                            <FilterListIcon fontSize="small" />
                        </ToolbarButton>
                    </Badge>
                </Tooltip>
            )}
        />
    );
}
