import { NavItem } from "@/data/navbat";
import NextLink from "@/components/Link";
import { Badge, Box, Button, SxProps } from "@mui/material";
import { usePathname } from "next/navigation";
import { activeButtonSx, navButtonSx } from "./styles";

const badgeSx = {
    transition: "all 0.2s ease",

    "&:hover": {
        transform: "translateY(-2px)",
    },
};

function NavButton({ item, isActive }: { item: NavItem; isActive: boolean }) {
    const button = (
        <Button
            component={NextLink}
            href={item.href}
            size="small"
            sx={{
                ...navButtonSx,
                ...(isActive && activeButtonSx),
            }}
        >
            {item.name}
        </Button>
    );

    if (isActive) return button;

    const badgeContent = (item.badge ?? false) ? 1 : 0;

    return (
        <Badge
            badgeContent={badgeContent}
            color="info"
            overlap="circular"
            variant="dot"
            anchorOrigin={{
                horizontal: item.position,
            }}
            sx={badgeSx}
        >
            {button}
        </Badge>
    );
}

export default function DesktopNav({
    items,
    containerSx,
}: {
    items: NavItem[];
    containerSx?: SxProps;
}) {
    const pathname = usePathname();

    const { left, right } = items.reduce(
        (acc, item) => {
            acc[item.position].push(item);
            return acc;
        },
        { left: [] as NavItem[], right: [] as NavItem[] },
    );

    const isActive = (href?: string) =>
        !!(href && (pathname === href || pathname.startsWith(href + "/")));

    return (
        <Box
            component="nav"
            role="navigation"
            aria-label="Primary"
            sx={{
                display: "flex",
                alignItems: "center",
                width: "100%",
                ...containerSx,
            }}
        >
            <Box
                sx={{
                    display: { xs: "none", md: "flex" },
                    alignItems: "center",
                    gap: 1,
                }}
            >
                {left.map((value) => (
                    <NavButton
                        key={value.href}
                        item={value}
                        isActive={isActive(value.href)}
                    />
                ))}
            </Box>

            <Box
                sx={{
                    ml: "auto",
                    display: { xs: "none", md: "flex" },
                    alignItems: "center",
                    gap: 1,
                }}
            >
                {right.map((value) => (
                    <NavButton
                        key={value.href}
                        item={value}
                        isActive={isActive(value.href)}
                    />
                ))}
            </Box>
        </Box>
    );
}
