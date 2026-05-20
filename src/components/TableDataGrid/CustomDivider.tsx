import { Divider } from "@mui/material";

/**
 * Renders the custom divider component.
 */
export default function CustomDivider({ flex }: { flex?: boolean }) {
    return (
        <Divider
            orientation="vertical"
            variant="middle"
            flexItem={flex}
            sx={{ mx: 0.5 }}
        />
    );
}
