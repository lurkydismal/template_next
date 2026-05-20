import { TextField, styled } from "@mui/material";
import { QuickFilter, ToolbarButton } from "@mui/x-data-grid";

export type OwnerState = {
    expanded: boolean;
};

/**
 * Provides the styled quick filter container for the data grid toolbar.
 */
export const StyledQuickFilter = styled(QuickFilter)({
    display: "grid",
    alignItems: "center",
});

/**
 * Provides the styled toolbar button used by custom data grid controls.
 */
export const StyledToolbarButton = styled(ToolbarButton)<{
    ownerState: OwnerState;
}>(({ theme, ownerState }) => ({
    gridArea: "1 / 1",
    width: "min-content",
    height: "min-content",
    zIndex: 1,
    opacity: ownerState.expanded ? 0 : 1,
    pointerEvents: ownerState.expanded ? "none" : "auto",
    transition: theme.transitions.create(["opacity"]),
}));

/**
 * Provides the styled text field used by the custom quick filter.
 */
export const StyledTextField = styled(TextField)<{
    ownerState: OwnerState;
}>(({ theme, ownerState }) => ({
    gridArea: "1 / 1",
    overflowX: "clip",
    width: ownerState.expanded ? 260 : "var(--trigger-width)",
    opacity: ownerState.expanded ? 1 : 0,
    transition: theme.transitions.create(["width", "opacity"]),
}));
