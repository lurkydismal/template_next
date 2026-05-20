import { formatDate } from "@/utils/dayjs";
import { Grid, Typography } from "@mui/material";
import { Dayjs } from "dayjs";

type MetadataFieldsProps = {
    row: Record<string, unknown>;
};

/**
 * Renders one read-only metadata field in the row dialog footer.
 */
function MetadataField({
    label,
    value,
}: {
    label: string;
    value: React.ReactNode;
}) {
    return (
        <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="subtitle2" color="text.secondary">
                {label}
            </Typography>
            <Typography variant="subtitle2" sx={{ display: "block" }}>
                {value}
            </Typography>
        </Grid>
    );
}

/**
 * Renders row audit metadata below the editable dialog fields.
 */
export default function MetadataFields({ row }: MetadataFieldsProps) {
    return (
        <>
            <MetadataField
                label="Created"
                value={formatDate(
                    (row as { created_at: string | Date | Dayjs }).created_at,
                    true,
                )}
            />
            <MetadataField
                label="Updated"
                value={formatDate(
                    (row as { updated_at: string | Date | Dayjs }).updated_at,
                    true,
                )}
            />
            <MetadataField
                label="Author"
                value={(row as { author?: string }).author ?? "—"}
            />
            <MetadataField
                label="Last editor"
                value={(row as { last_editor?: string }).last_editor ?? "—"}
            />
        </>
    );
}
