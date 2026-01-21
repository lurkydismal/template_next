import { formatDate } from "@/utils/dayjs";
import { Image as ImageIcon } from "@mui/icons-material";
import {
    Chip,
    Dialog,
    DialogContent,
    Divider,
    Grid,
    TextField,
    Typography,
} from "@mui/material";
import {
    ChangeEvent,
    Dispatch,
    RefObject,
    SetStateAction,
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import RowImageDialog from "./RowImageDialog";
import log from "@/utils/stdlog";
import { TableRow, TableRowInsert } from "@/db/schema";
import { updateAction } from "@/lib/update";
import { GridApi } from "@mui/x-data-grid";

type FieldType = "text" | "multiline" | "image";
type Field<T = unknown> = {
    title: string;
    type: FieldType;
    value: T;
    setValue: Dispatch<SetStateAction<T>>;
    name?: string;
    size?: number;
};

function RowDialogContent({
    row,
    registerSubmit,
    apiRef,
}: {
    row: Readonly<TableRow>;
    registerSubmit: (fn: (() => Promise<void>) | null) => void;
    apiRef: RefObject<GridApi | null>;
}) {
    const [content, setContent] = useState<string | null>(row.content ?? null);
    const [src, setSrc] = useState<string | null>(
        row.id ? String(row.id) : null,
    );
    const [open, setOpen] = useState(false);

    type FieldTypeMap = {
        text: string | null;
        multiline: string | null;
        image: string | null;
    };

    type FieldUnion = {
        [K in keyof FieldTypeMap]: Field<FieldTypeMap[K]> & { type: K };
    }[keyof FieldTypeMap];

    const fields: FieldUnion[] = [
        {
            title: "Content",
            type: "text",
            value: content,
            setValue: setContent,
            name: "content",
        },
        {
            title: "Picture",
            type: "image",
            value: src,
            setValue: setSrc,
        },
    ];

    const renderValue = (field: (typeof fields)[0]) => {
        switch (field.type) {
            case "image": {
                return (
                    <Chip
                        icon={<ImageIcon />}
                        label="Open image"
                        size="medium"
                        onClick={() => setOpen(true)}
                        variant="outlined"
                        sx={{
                            p: "0.5rem",
                            fontSize: "1.125rem",
                        }}
                    />
                );
            }

            case "multiline":
                return (
                    <TextField
                        name={field.name}
                        id={`${field.title}-multiline`}
                        value={field.value ?? ""}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => {
                            field.setValue(event.target.value);
                        }}
                        multiline
                        fullWidth
                        minRows={4}
                        maxRows={4}
                    />
                );

            case "text":
            default:
                return (
                    <TextField
                        name={field.name}
                        required
                        id={`${field.title}-text`}
                        value={field.value ?? ""}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => {
                            field.setValue(event.target.value);
                        }}
                    />
                );
        }
    };

    const formRef = useRef<HTMLFormElement | null>(null);

    const submit = useCallback(async () => {
        type Values = {
            content: string | null;
        };

        const norm = (s: string | null | undefined) => (s ?? "").trim();

        const isRowChanged = (row: TableRowInsert, values: Values) => {
            if (norm(row.content) !== norm(values.content)) return true;

            return false;
        };

        const values: Values = {
            content: content,
        };

        if (!isRowChanged(row, values)) {
            return;
        }

        // construct FormData from your current state values
        const fd = new FormData(formRef.current ?? undefined);
        fd.append("target", "table");

        // call server action directly
        await updateAction(fd);

        // update DataGrid row locally (apiRef from parent)
        apiRef?.current?.updateRows?.([
            {
                id: row.id,
                content: content,
                // if you store updated_at locally, set it too:
                updated_at: new Date(),
            },
        ]);
    }, [row, content, apiRef]);

    useEffect(() => {
        registerSubmit(submit);
        return () => registerSubmit(null);
    }, [registerSubmit, submit]);

    return (
        <>
            <form
                ref={formRef}
                onSubmit={(e) => {
                    e.preventDefault();
                    void submit();
                }}
            >
                <Grid container spacing={2}>
                    <input type="hidden" name="id" value={row.id} />

                    {fields.map((field, index) => (
                        <Grid
                            key={`${field.title}-${index}`}
                            size={{ xs: 12, sm: field.size ?? 6 }}
                        >
                            <Typography
                                variant="subtitle1"
                                color="text.secondary"
                            >
                                {field.title}
                            </Typography>
                            {renderValue(field)}
                        </Grid>
                    ))}

                    <Grid size={{ xs: 12 }}>
                        <Divider />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="subtitle2" color="text.secondary">
                            Created
                        </Typography>
                        <Typography variant="subtitle2" display="block">
                            {formatDate(row.created_at, true)}
                        </Typography>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="subtitle2" color="text.secondary">
                            Updated
                        </Typography>
                        <Typography variant="subtitle2" display="block">
                            {formatDate(row.updated_at, true)}
                        </Typography>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="subtitle2" color="text.secondary">
                            Author
                        </Typography>
                        <Typography variant="subtitle2" display="block">
                            {"Author"}
                        </Typography>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="subtitle2" color="text.secondary">
                            Last editor
                        </Typography>
                        <Typography variant="subtitle2" display="block">
                            {"Last Editor"}
                        </Typography>
                    </Grid>
                </Grid>

                <RowImageDialog
                    id={row.id}
                    src={`/${row.id}.jpg`}
                    open={open}
                    setOpen={setOpen}
                />
            </form>
        </>
    );
}

export default function RowDialog({
    apiRef,
    selectedRow,
    dialogOpen,
    handleClose,
    setSelectedRow,
}: {
    apiRef: RefObject<GridApi | null>;
    selectedRow: TableRow | null;
    dialogOpen: boolean;
    handleClose: () => void;
    setSelectedRow: Dispatch<SetStateAction<TableRow | null>>;
}) {
    // store async submit function registered from the child
    const submitFnRef = useRef<(() => Promise<void>) | null>(null);

    const registerSubmit = (fn: (() => Promise<void>) | null) => {
        submitFnRef.current = fn;
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const onClose = async (_event?: unknown, reason?: unknown) => {
        if (submitFnRef.current) {
            try {
                await submitFnRef.current();
            } catch (err) {
                // handle/report error if needed
                log.error("Failed to submit dialog form on close", err);
            }
        }

        handleClose(); // then close the dialog
    };

    return (
        <Dialog
            open={dialogOpen}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            keepMounted
            slotProps={{
                transition: {
                    onExited: () => {
                        // only clear the heavy/volatile data after exit animation completes
                        setSelectedRow(null);
                    },
                },
            }}
        >
            <DialogContent sx={{}}>
                {selectedRow && (
                    <RowDialogContent
                        row={selectedRow}
                        registerSubmit={registerSubmit}
                        apiRef={apiRef}
                    ></RowDialogContent>
                )}
            </DialogContent>
        </Dialog>
    );
}
