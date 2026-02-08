// RowDialog.tsx
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
    Button,
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
import { GridApi } from "@mui/x-data-grid";
import { useSnackbar } from "@/components/SnackbarProvider";
import { isBlob } from "@/utils/stdfunc";

/* ----------------------------
   Types
   ---------------------------- */
type DefaultFieldType = "text" | "multiline" | "image" | "custom";

export type FieldConfig<R, RI = any, K extends keyof any = keyof R | string> = {
    key: K; // property key in row/insert (string allowed for synthetic fields)
    label: string;
    type?: DefaultFieldType;
    name?: string; // form field name (defaults to key)
    size?: number; // value passed to Grid xs/sm/etc (use 12, 6, 4)
    required?: boolean;
    // optional custom render: (value, setValue, row) => ReactNode
    render?: (
        value: any,
        setValue: (v: any) => void,
        row: R,
    ) => React.ReactNode;
    // convert local value to form payload value
    toFormValue?: (v: any) => string | Blob | undefined;
    // optional comparator for this field
    isChanged?: (rowValue: any, currentValue: any) => boolean;
};

type UpdateRowAction = (fd: FormData) => Promise<boolean>;

type RowDialogContentProps<R, RI> = {
    apiRef: RefObject<GridApi | null>;
    row: R;
    fields: FieldConfig<R, RI>[];
    registerSubmit: (fn: (() => Promise<boolean>) | null) => void;
    updateRowAction: UpdateRowAction;
    isRowChanged?: (row: R, values: Partial<RI>) => boolean;
    idKey?: keyof R; // defaults to "id"
};

function RowDialogContent<
    R extends Record<string, any>,
    RI extends Record<string, any>,
>({
    apiRef,
    row,
    fields,
    registerSubmit,
    updateRowAction,
    isRowChanged,
    idKey = "id" as keyof R,
}: RowDialogContentProps<R, RI>) {
    const { showError } = useSnackbar();
    const formRef = useRef<HTMLFormElement | null>(null);

    // build initial values map from row using fields
    const buildInitial = () => {
        const out: Record<string, any> = {};
        for (const f of fields) {
            const key = String(f.key);
            const raw = (row as any)[key];
            // default initial value resolution:
            out[key] = raw ?? null;
        }
        return out;
    };

    const [values, setValues] = useState<Record<string, any>>(buildInitial());
    const [imageOpenFor, setImageOpenFor] = useState<string | null>(null);

    // keep values in sync if selected row changes externally
    useEffect(() => {
        setValues(buildInitial());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [row]);

    const setValue = (key: string, v: any) =>
        setValues((s) => ({ ...s, [key]: v }));

    // default comparator if user didn't provide isRowChanged
    const defaultIsChanged = (rowObj: R, newValues: Partial<RI>) => {
        for (const f of fields) {
            const key = String(f.key);
            const rowVal = (rowObj as any)[key];
            const newVal = (newValues as any)[key];
            const eq =
                typeof f.isChanged === "function"
                    ? !f.isChanged(rowVal, newVal)
                    : String((rowVal ?? "").toString()).trim() ===
                      String((newVal ?? "").toString()).trim();
            if (!eq) return true;
        }
        return false;
    };

    const _updateRow = useCallback(
        async (fd: FormData): Promise<boolean> => {
            try {
                const status = await updateRowAction(fd);

                if (status) {
                    // update DataGrid row locally (apiRef from parent)
                    const id = (row as any)[idKey];
                    if (id !== undefined && apiRef?.current?.updateRows) {
                        apiRef.current.updateRows([
                            {
                                id,
                                ...values,
                                updated_at: new Date(),
                            },
                        ]);
                    }
                    return true;
                }

                return false;
            } catch (err) {
                showError(err);
                return false;
            }
        },
        [updateRowAction, row, values, apiRef, showError, idKey],
    );

    const submit = useCallback(async (): Promise<boolean> => {
        // values typed as Partial<RI>
        const currentValues = values as Partial<RI>;

        const changed =
            typeof isRowChanged === "function"
                ? isRowChanged(row, currentValues)
                : defaultIsChanged(row, currentValues);

        if (!changed) return true;

        // FormData from DOM
        const fd = new FormData(formRef.current ?? undefined);

        // ensure all field values are present in FormData (covers fields without <input>)
        for (const f of fields) {
            const name = f.name ?? String(f.key);
            const key = String(f.key);
            const val = currentValues[key];

            if (f.toFormValue) {
                const v = f.toFormValue(val);
                if (v !== undefined) fd.set(name, v as any);
            } else {
                // default stringify
                if (val === null || val === undefined) {
                    // ensure empty string exists if expected
                    if (!fd.has(name)) fd.set(name, "");
                } else if (isBlob(val)) {
                    fd.set(name, val);
                } else {
                    fd.set(name, String(val));
                }
            }
        }

        return await _updateRow(fd);
    }, [_updateRow, fields, isRowChanged, row, values]);

    useEffect(() => {
        registerSubmit(submit);
        return () => registerSubmit(null);
    }, [registerSubmit, submit]);

    const renderField = (f: FieldConfig<R, RI>, idx: number) => {
        const key = String(f.key);
        const name = f.name ?? key;
        const val = values[key];

        if (typeof f.render === "function") {
            return (
                <div key={`${key}-${idx}`}>
                    <Typography variant="subtitle1" color="text.secondary">
                        {f.label}
                    </Typography>
                    {f.render(val, (v) => setValue(key, v), row)}
                </div>
            );
        }

        switch (f.type ?? "text") {
            case "image":
                return (
                    <div key={`${key}-${idx}`}>
                        <Typography variant="subtitle1" color="text.secondary">
                            {f.label}
                        </Typography>
                        <Chip
                            icon={<ImageIcon />}
                            label="Open image"
                            size="medium"
                            onClick={() => setImageOpenFor(key)}
                            variant="outlined"
                            sx={{ p: "0.5rem", fontSize: "1.125rem" }}
                        />
                        {/* keep a hidden input so FormData picks up a string id if needed */}
                        <input type="hidden" name={name} value={val ?? ""} />
                        <RowImageDialog
                            id={(row as any)[idKey]}
                            src={String(val ?? "")}
                            open={imageOpenFor === key}
                            setOpen={(v) => setImageOpenFor(v ? key : null)}
                        />
                    </div>
                );

            case "multiline":
                return (
                    <div key={`${key}-${idx}`}>
                        <Typography variant="subtitle1" color="text.secondary">
                            {f.label}
                        </Typography>
                        <TextField
                            name={name}
                            id={`${key}-multiline`}
                            value={val ?? ""}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                setValue(key, e.target.value)
                            }
                            multiline
                            fullWidth
                            minRows={4}
                            maxRows={8}
                        />
                    </div>
                );

            case "text":
            default:
                return (
                    <div key={`${key}-${idx}`}>
                        <Typography variant="subtitle1" color="text.secondary">
                            {f.label}
                        </Typography>
                        <TextField
                            name={name}
                            required={!!f.required}
                            id={`${key}-text`}
                            value={val ?? ""}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                setValue(key, e.target.value)
                            }
                        />
                    </div>
                );
        }
    };

    return (
        <form
            ref={formRef}
            onSubmit={(e) => {
                e.preventDefault();
                submit();
            }}
        >
            <Grid container spacing={2}>
                {/* Hidden id if present */}
                {((row as any)[idKey] ?? null) !== null && (
                    <input
                        type="hidden"
                        name={String(idKey)}
                        value={String((row as any)[idKey])}
                    />
                )}

                {fields.map((field, index) => (
                    <Grid
                        size={{ xs: 12, sm: field.size ?? 6 }}
                        key={`${String(field.key)}-${index}`}
                    >
                        {renderField(field, index)}
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
                        {formatDate((row as any).created_at, true)}
                    </Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                        Updated
                    </Typography>
                    <Typography variant="subtitle2" display="block">
                        {formatDate((row as any).updated_at, true)}
                    </Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                        Author
                    </Typography>
                    <Typography variant="subtitle2" display="block">
                        {(row as any).author ?? "—"}
                    </Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                        Last editor
                    </Typography>
                    <Typography variant="subtitle2" display="block">
                        {(row as any).last_editor ?? "—"}
                    </Typography>
                </Grid>
            </Grid>
        </form>
    );
}

/* ----------------------------
   Outer Dialog
   ---------------------------- */
export default function RowDialog<
    R extends Record<string, any>,
    RI extends Record<string, any>,
>({
    apiRef,
    dialogOpen,
    handleClose,
    selectedRow,
    setSelectedRow,
    updateRowAction,
    fields,
    isRowChanged,
    idKey = "id" as keyof R,
}: {
    apiRef: RefObject<GridApi | null>;
    dialogOpen: boolean;
    handleClose: () => void;
    selectedRow: R | null;
    setSelectedRow: Dispatch<SetStateAction<R | null>>;
    updateRowAction: UpdateRowAction;
    fields: FieldConfig<R, RI>[];
    isRowChanged?: (row: R, values: Partial<RI>) => boolean;
    idKey?: keyof R;
}) {
    const submitFnRef = useRef<(() => Promise<boolean>) | null>(null);

    const registerSubmit = (fn: (() => Promise<boolean>) | null) => {
        submitFnRef.current = fn;
    };

    const onClose = async () => {
        if (submitFnRef.current) {
            try {
                const ok = await submitFnRef.current();
                if (!ok) return; // prevent closing
            } catch (err) {
                log.error("Failed to submit dialog form on close", err);
                return;
            }
        }

        handleClose();
    };

    return (
        <Dialog
            open={dialogOpen}
            onClose={() => onClose()}
            maxWidth="md"
            fullWidth
            keepMounted
            slotProps={{
                transition: {
                    onExited: () => {
                        setSelectedRow(null);
                    },
                },
            }}
        >
            <DialogContent>
                {selectedRow && (
                    <RowDialogContent<R, RI>
                        apiRef={apiRef}
                        row={selectedRow}
                        fields={fields}
                        registerSubmit={registerSubmit}
                        updateRowAction={updateRowAction}
                        isRowChanged={isRowChanged}
                        idKey={idKey}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}
