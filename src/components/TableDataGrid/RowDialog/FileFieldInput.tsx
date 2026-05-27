import { ChangeEvent, useMemo, useState } from "react";
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    Link,
    Stack,
    Typography,
} from "@mui/material";
import { Control, Controller, FieldError, RegisterOptions } from "react-hook-form";
import { isImagePath, toAcceptString } from "`@/utils/fileHelpers`";

type FileFieldInputProps = {
    fieldKey: string;
    label: string;
    name: string;
    required: boolean;
    readOnly?: boolean;
    value: unknown;
    accept?: string | string[];
    control: Control<Record<string, unknown>>;
    error?: FieldError;
    rules?: RegisterOptions<Record<string, unknown>, string>;
    onValueChange: (value: File | null) => void;
};

/**
 * Renders a file field with optional type filtering and image preview behavior.
 */
/**
 * Renders image preview dialog content with loading/error states and retry support.
 */
function ImagePreviewContent({ sourceValue, label }: { sourceValue: string; label: string }) {
    const [isLoadingPreview, setIsLoadingPreview] = useState(true);
    const [hasPreviewError, setHasPreviewError] = useState(false);
    const [imageRetryKey, setImageRetryKey] = useState(0);

    /**
     * Marks the preview as successfully loaded.
     */
    function handlePreviewLoad(): void {
        setIsLoadingPreview(false);
    }

    /**
     * Marks the preview as failed to load.
     */
    function handlePreviewError(): void {
        setIsLoadingPreview(false);
        setHasPreviewError(true);
    }

    /**
     * Retries loading the preview image.
     */
    function handleRetryPreview(): void {
        setIsLoadingPreview(true);
        setHasPreviewError(false);
        setImageRetryKey((currentValue) => currentValue + 1);
    }

    return (
        <DialogContent>
            {isLoadingPreview ? (
                <Box display="flex" justifyContent="center" py={4}>
                    <CircularProgress aria-label="Loading image preview" />
                </Box>
            ) : null}
            {!isLoadingPreview && hasPreviewError ? (
                <Stack spacing={1} alignItems="flex-start" py={2}>
                    <Typography variant="body2" color="text.secondary">
                        We could not load this image preview.
                    </Typography>
                    <Stack direction="row" spacing={1}>
                        <Button variant="outlined" onClick={handleRetryPreview}>
                            Retry
                        </Button>
                        <Button
                            variant="text"
                            component="a"
                            href={sourceValue}
                            target="_blank"
                            rel="noreferrer"
                        >
                            Open in new tab
                        </Button>
                    </Stack>
                </Stack>
            ) : null}
            {!hasPreviewError ? (
                <img
                    key={`${sourceValue}-${imageRetryKey}`}
                    src={sourceValue}
                    alt={label}
                    onLoad={handlePreviewLoad}
                    onError={handlePreviewError}
                    style={{
                        width: "100%",
                        height: "auto",
                        display: isLoadingPreview ? "none" : "block",
                    }}
                />
            ) : null}
        </DialogContent>
    );
}

export default function FileFieldInput({
    fieldKey,
    label,
    name,
    required,
    readOnly = false,
    value,
    accept,
    control,
    error,
    rules,
    onValueChange,
}: FileFieldInputProps) {
    const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
    const acceptValue = useMemo(() => toAcceptString(accept), [accept]);
    const sourceValue = typeof value === "string" ? value : "";
    const sourceIsImage = isImagePath(sourceValue);

    /**
     * Closes the image preview dialog.
     */
    function handleClosePreview(): void {
        setImagePreviewOpen(false);
    }

    return (
        <Stack spacing={1}>
            <Typography variant="subtitle1" color="text.secondary">
                {label}
            </Typography>
            <Controller
                name={name}
                control={control}
                defaultValue={value ?? null}
                rules={rules}
                disabled={readOnly}
                render={({ field }) => (
                    <Stack spacing={1}>
                        <Button component="label" variant="outlined" disabled={readOnly}>
                            Select file
                            <input
                                id={`${fieldKey}-file`}
                                type="file"
                                hidden
                                accept={acceptValue}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                    if (readOnly) return;

                                    const file = e.target.files?.[0] ?? null;
                                    field.onChange(file);
                                    onValueChange(file);
                                }}
                            />
                        </Button>
                        {sourceValue ? (
                            sourceIsImage ? (
                                <Link
                                    component="button"
                                    type="button"
                                    underline="hover"
                                    onClick={() => setImagePreviewOpen(true)}
                                >
                                    Open image
                                </Link>
                            ) : (
                                <Link href={sourceValue} download rel="noreferrer">
                                    Download file
                                </Link>
                            )
                        ) : null}
                        {field.value instanceof File ? (
                            <Typography variant="body2">Selected: {field.value.name}</Typography>
                        ) : null}
                        {error?.message ? (
                            <Typography variant="caption" color="error">
                                {error.message}
                            </Typography>
                        ) : null}
                    </Stack>
                )}
            />
            <Dialog
                open={imagePreviewOpen}
                onClose={handleClosePreview}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>{label}</DialogTitle>
                <ImagePreviewContent
                    key={`${imagePreviewOpen ? "open" : "closed"}-${sourceValue}`}
                    sourceValue={sourceValue}
                    label={label}
                />
            </Dialog>
        </Stack>
    );
}
