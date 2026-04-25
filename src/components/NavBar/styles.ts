import { linkSx } from "@/data/styles";

export const navButtonSx = {
    ...linkSx,
    px: 2.5,
    fontWeight: 600,

    "&::after": {
        ...linkSx["&::after"],
        left: 16,
        right: 16,
        bottom: 6,
    },
};

export const activeButtonSx = {
    backgroundColor: "primary.main",
    color: "primary.contrastText",
    fontWeight: 700,

    "&::after": {
        display: "none",
    },

    "&:hover": {
        backgroundColor: "primary.dark",
        transform: "translateY(-2px)",
    },
};
