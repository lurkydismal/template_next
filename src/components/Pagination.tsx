import { Box, Pagination } from "@mui/material";

export default function PostsPagination({
    total,
    perPage,
    onChange,
}: {
    total: number;
    perPage: number;
    onChange: (event: React.ChangeEvent<unknown>, page: number) => void;
}) {
    return (
        <Box sx={{ display: "flex", flexDirection: "row", pt: 4 }}>
            <Pagination
                onChange={onChange}
                count={Math.ceil(total / perPage)}
                showFirstButton
                showLastButton
            />
        </Box>
    );
}
