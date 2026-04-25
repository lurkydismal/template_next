"use client";

import { CloseRounded, Menu } from "@mui/icons-material";
import { Fragment, useCallback, useMemo, useState } from "react";
import NextLink from "@/components/Link";
import { NavItem } from "@/data/navbat";
import {
    Drawer,
    Box,
    IconButton,
    MenuItem,
    Divider,
    Button,
} from "@mui/material";

export default function MobileNav({ items }: { items: NavItem[] }) {
    const [open, setOpen] = useState(false);

    const left = useMemo(
        () => items.filter((i) => i.position === "left"),
        [items],
    );
    const right = useMemo(
        () => items.filter((i) => i.position === "right"),
        [items],
    );

    const openDrawer = useCallback(() => setOpen(true), []);
    const closeDrawer = useCallback(() => setOpen(false), []);

    // close drawer when a nav link is clicked (works even when using component={NextLink})
    const onLinkClick = useCallback(() => {
        closeDrawer();
    }, [closeDrawer]);

    return (
        <Box sx={{ display: { xs: "flex", md: "none" }, gap: 1 }}>
            <IconButton
                aria-label="Open navigation"
                aria-haspopup="true"
                aria-expanded={open}
                onClick={openDrawer}
                size="large"
            >
                <Menu />
            </IconButton>

            <Drawer
                anchor="top"
                open={open}
                onClose={closeDrawer}
                keepMounted // avoid unmounting for smoother close on mobile
                slotProps={{
                    paper: {
                        sx: { top: "var(--template-frame-height, 0px)" },
                        role: "menu",
                        "aria-label": "Mobile primary navigation",
                    },
                }}
                ModalProps={{
                    // ensures focus trap and Escape key close are active
                    keepMounted: true,
                }}
            >
                <Box sx={{ p: 1, backgroundColor: "background.default" }}>
                    <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                        <IconButton
                            onClick={closeDrawer}
                            aria-label="Close navigation"
                            size="large"
                        >
                            <CloseRounded />
                        </IconButton>
                    </Box>

                    {left.map((value, index) => {
                        const isLast = index === left.length - 1;

                        return (
                            <Fragment key={value.href ?? `left-${index}`}>
                                <MenuItem
                                    href={value.href}
                                    component={NextLink}
                                    onClick={onLinkClick}
                                    data-nav-position="left"
                                >
                                    {value.name}
                                </MenuItem>

                                {!isLast && <Divider />}
                            </Fragment>
                        );
                    })}

                    <Divider sx={{ my: 3 }} />

                    <MenuItem sx={{ gap: 1 }}>
                        {right.map((value, index) => (
                            <Button
                                key={value.href ?? `right-${index}`}
                                color="primary"
                                variant="contained"
                                href={value.href}
                                component={NextLink}
                                fullWidth
                                onClick={onLinkClick}
                                data-nav-position="right"
                            >
                                {value.name}
                            </Button>
                        ))}
                    </MenuItem>
                </Box>
            </Drawer>
        </Box>
    );
}
