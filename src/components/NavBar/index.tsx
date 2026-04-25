"use client";

import DesktopNav from "./DesktopNav";
import { items } from "@/data/navbat";
import MobileNav from "./MobileNav";
import { styled, Toolbar, alpha, AppBar, Container } from "@mui/material";

const StyledToolbar = styled(Toolbar)(({ theme }) => ({
    alignItems: "center",
    backdropFilter: "blur(24px)",
    backgroundColor: theme.vars
        ? `rgba(${theme.vars.palette.background.defaultChannel} / 0.4)`
        : alpha(theme.palette.background.default, 0.4),
    borderColor: (theme.vars || theme).palette.divider,
    borderRadius: `calc(${theme.shape.borderRadius}px + 8px)`,
    boxShadow: (theme.vars || theme).shadows[1],
    // border: "1px solid",
    display: "flex",
    flexShrink: 0,
    justifyContent: "space-between",
    padding: "8px 12px",
}));

export default function NavBar() {
    return (
        <AppBar
            enableColorOnDark
            position="fixed"
            sx={{
                backgroundImage: "none",
                bgcolor: "transparent",
                boxShadow: 0,
                mt: "calc(var(--template-frame-height, 0px) + 28px)",
            }}
        >
            <Container maxWidth="lg">
                <StyledToolbar variant="dense" disableGutters>
                    <DesktopNav
                        items={items}
                        containerSx={{ display: "flex", alignItems: "center" }}
                    />

                    <MobileNav items={items} />
                </StyledToolbar>
            </Container>
        </AppBar>
    );
}
