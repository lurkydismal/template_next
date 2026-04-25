import Footer from "@/components/Footer";
import NavBar from "@/components/NavBar";
import { Box, Container } from "@mui/material";

export default async function Layout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
            }}
        >
            <NavBar />

            <Container
                maxWidth="xl"
                sx={{
                    flexGrow: 1,
                    display: "flex",
                    flexDirection: "column",
                    mt: 11,
                    mb: 4,
                    gap: 4,
                }}
            >
                {children}
            </Container>

            <Footer />
        </Box>
    );
}
