export const linkSx = {
    cursor: "pointer",
    borderRadius: 2,
    textTransform: "none",
    position: "relative",
    transition: "all 0.2s ease",
    willChange: "transform",

    "&::after": {
        content: '""',
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 2,
        backgroundColor: "primary.main",
        transform: "scaleX(0)",
        transition: "transform 0.2s ease",
    },

    "&:hover": {
        backgroundColor: "action.hover",
        transform: "translateY(-2px)",
    },

    "&:hover::after": {
        transform: "scaleX(1)",
    },

    "&:focus-visible": {
        outline: "2px solid",
        outlineColor: "primary.main",
        outlineOffset: 2,
    },
};
