import { gridClasses } from "@mui/x-data-grid";
import { gray } from "@/theme/themePrimitives";
import {
    Theme,
    checkboxClasses,
    tablePaginationClasses,
    paperClasses,
    menuItemClasses,
    listItemIconClasses,
    listClasses,
    iconButtonClasses,
    alpha,
} from "@mui/material";

// Custom style overrides for MUI DataGrid and related components
export const dataGridCustomizations = {
    MuiDataGrid: {
        styleOverrides: {
            /**
             * Returns root slot styles for the data grid theme override.
             */
            root: ({ theme }: { theme: Theme }) => ({
                "--DataGrid-overlayHeight": "300px",
                overflow: "clip",
                borderColor: (theme.vars || theme).palette.divider,
                backgroundColor: (theme.vars || theme).palette.background
                    .default,
                [`& .${gridClasses.columnHeader}`]: {
                    backgroundColor: (theme.vars || theme).palette.background
                        .paper,
                },
                [`& .${gridClasses.footerContainer}`]: {
                    backgroundColor: (theme.vars || theme).palette.background
                        .paper,
                },
                [`& .${checkboxClasses.root}`]: {
                    padding: theme.spacing(0.5),
                    "& > svg": {
                        fontSize: "1rem", // smaller checkbox icons
                    },
                },
                [`& .${tablePaginationClasses.root}`]: {
                    marginRight: theme.spacing(1),
                    "& .MuiIconButton-root": {
                        maxHeight: 32,
                        maxWidth: 32,
                        "& > svg": {
                            fontSize: "1rem", // smaller pagination icons
                        },
                    },
                },
            }),
            /**
             * Returns cell slot styles for the data grid theme override.
             */
            cell: ({ theme }: { theme: Theme }) => ({
                borderTopColor: (theme.vars || theme).palette.divider,
            }),
            /**
             * Returns menu slot styles for the data grid theme override.
             */
            menu: ({ theme }: { theme: Theme }) => ({
                borderRadius: theme.shape.borderRadius,
                backgroundImage: "none",
                [`& .${paperClasses.root}`]: {
                    border: `1px solid ${(theme.vars || theme).palette.divider}`,
                },
                [`& .${menuItemClasses.root}`]: {
                    margin: "0 4px",
                },
                [`& .${listItemIconClasses.root}`]: {
                    marginRight: 0,
                },
                [`& .${listClasses.root}`]: {
                    paddingLeft: 0,
                    paddingRight: 0,
                },
            }),
            /**
             * Returns row slot styles for the data grid theme override.
             */
            row: ({ theme }: { theme: Theme }) => ({
                "&:last-of-type": {
                    borderBottom: `1px solid ${(theme.vars || theme).palette.divider}`,
                },
                "&:hover": {
                    backgroundColor: (theme.vars || theme).palette.action.hover,
                },
                "&.Mui-selected": {
                    background: (theme.vars || theme).palette.action.selected,
                    "&:hover": {
                        backgroundColor: (theme.vars || theme).palette.action
                            .hover,
                    },
                },
            }),
            /**
             * Returns icon button container styles for the data grid theme override.
             */
            iconButtonContainer: ({ theme }: { theme: Theme }) => ({
                [`& .${iconButtonClasses.root}`]: {
                    border: "none",
                    backgroundColor: "transparent",
                    "&:hover": {
                        backgroundColor: alpha(
                            theme.palette.action.selected,
                            0.3,
                        ),
                    },
                    "&:active": {
                        backgroundColor: gray[200],
                    },
                    ...theme.applyStyles("dark", {
                        color: gray[50],
                        "&:hover": {
                            backgroundColor: gray[800],
                        },
                        "&:active": {
                            backgroundColor: gray[900],
                        },
                    }),
                },
            }),
            /**
             * Returns menu icon button styles for the data grid theme override.
             */
            menuIconButton: ({ theme }: { theme: Theme }) => ({
                border: "none",
                backgroundColor: "transparent",
                "&:hover": {
                    backgroundColor: gray[100],
                },
                "&:active": {
                    backgroundColor: gray[200],
                },
                ...theme.applyStyles("dark", {
                    color: gray[50],
                    "&:hover": {
                        backgroundColor: gray[800],
                    },
                    "&:active": {
                        backgroundColor: gray[900],
                    },
                }),
            }),
            /**
             * Returns filter form styles for the data grid theme override.
             */
            filterForm: ({ theme }: { theme: Theme }) => ({
                gap: theme.spacing(1),
                alignItems: "flex-end",
            }),
            /**
             * Returns column management header styles for the data grid theme override.
             */
            columnsManagementHeader: ({ theme }: { theme: Theme }) => ({
                paddingRight: theme.spacing(3),
                paddingLeft: theme.spacing(3),
            }),
            columnHeaderTitleContainer: {
                flexGrow: 1,
                justifyContent: "space-between",
            },
            columnHeaderDraggableContainer: { paddingRight: 2 },
        },
    },
};
