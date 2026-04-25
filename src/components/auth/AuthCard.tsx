import { styled, Stack, Divider, Box, Card as MuiCard } from "@mui/material";
import { ReactNode } from "react";

export const Card = styled(MuiCard)(({ theme }) => ({
    display: "flex",
    flexDirection: "column",
    alignSelf: "center",
    width: "100%",
    padding: theme.spacing(4),
    gap: theme.spacing(2),
    margin: "auto",
    [theme.breakpoints.up("sm")]: {
        maxWidth: "450px",
    },
    boxShadow:
        "hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px",
    ...theme.applyStyles("dark", {
        boxShadow:
            "hsla(220, 30%, 5%, 0.5) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.08) 0px 15px 35px -5px",
    }),
}));

export const AuthContainer = styled(Stack)(({ theme }) => ({
    position: "relative",
    height: "calc((1 - var(--template-frame-height, 0)) * 100dvh)",
    minHeight: "100%",
    padding: theme.spacing(2),
    [theme.breakpoints.up("sm")]: {
        padding: theme.spacing(4),
    },
    "&::before": {
        content: '""',
        display: "block",
        inset: 0,
        position: "absolute",
        zIndex: -1,
        backgroundImage:
            "radial-gradient(ellipse at 50% 50%, hsl(210, 100%, 97%), hsl(0, 0%, 100%))",
        backgroundRepeat: "no-repeat",
        ...theme.applyStyles("dark", {
            backgroundImage:
                "radial-gradient(at 50% 50%, hsla(210, 100%, 16%, 0.5), hsl(220, 30%, 5%))",
        }),
    },
}));

type Props = {
    children: ReactNode;
    footer?: ReactNode;
    variant?: "outlined" | "elevation";
};

export default function AuthCard({
    children,
    footer,
    variant = "outlined",
}: Props) {
    return (
        <AuthContainer direction="column" justifyContent="space-between">
            <Card variant={variant}>
                {children}
                <Divider sx={{ my: 2 }} />
                {footer && (
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                        }}
                    >
                        {footer}
                    </Box>
                )}
            </Card>
        </AuthContainer>
    );
}
