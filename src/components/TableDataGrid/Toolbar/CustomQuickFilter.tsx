import {
    Cancel as CancelIcon,
    Search as SearchIcon,
} from "@mui/icons-material";
import { InputAdornment, Tooltip } from "@mui/material";
import {
    QuickFilterClear,
    QuickFilterControl,
    QuickFilterTrigger,
} from "@mui/x-data-grid";
import {
    StyledQuickFilter,
    StyledTextField,
    StyledToolbarButton,
} from "./styles";

/**
 * Renders the custom quick filter component.
 */
export default function CustomQuickFilter() {
    return (
        <StyledQuickFilter>
            <QuickFilterTrigger
                render={(triggerProps, state) => (
                    <Tooltip title="Search" enterDelay={0}>
                        <StyledToolbarButton
                            {...triggerProps}
                            ownerState={{ expanded: state.expanded }}
                            color="default"
                            disabled={state.expanded}
                            aria-disabled={state.expanded}
                        >
                            <SearchIcon fontSize="small" />
                        </StyledToolbarButton>
                    </Tooltip>
                )}
            />
            <QuickFilterControl
                render={({ ref, ...controlProps }, state) => (
                    <StyledTextField
                        {...controlProps}
                        ownerState={{ expanded: state.expanded }}
                        inputRef={ref}
                        aria-label="Search"
                        placeholder="Search..."
                        size="small"
                        slotProps={{
                            ...controlProps.slotProps,
                            input: {
                                ...controlProps.slotProps?.input,
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" />
                                    </InputAdornment>
                                ),
                                endAdornment: state.value ? (
                                    <InputAdornment position="end">
                                        <QuickFilterClear
                                            edge="end"
                                            size="small"
                                            aria-label="Clear search"
                                            material={{
                                                sx: { marginRight: -0.75 },
                                            }}
                                        >
                                            <CancelIcon fontSize="small" />
                                        </QuickFilterClear>
                                    </InputAdornment>
                                ) : null,
                            },
                        }}
                    />
                )}
            />
        </StyledQuickFilter>
    );
}
