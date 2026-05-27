import { ChangeEvent, useMemo } from "react";
import { Button, Link, Stack, Typography } from "@mui/material";
import {
    Control,
    Controller,
    FieldError,
    RegisterOptions,
} from "react-hook-form";
import { ImagePreviewDialog, useImagePreview } from "./ImagePreviewDialog";
import { isImagePath, toAcceptString } from "@/utils/fileHelpers";

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
    const { imagePreviewOpen, openImagePreview, closeImagePreview } =
        useImagePreview();
    const acceptValue = useMemo(() => toAcceptString(accept), [accept]);
    const sourceValue = typeof value === "string" ? value : "";
    const sourceIsImage = isImagePath(sourceValue);

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
                        <Button
                            component="label"
                            variant="outlined"
                            disabled={readOnly}
                        >
                            Select file
                            <input
                                id={`${fieldKey}-file`}
                                type="file"
                                hidden
                                accept={acceptValue}
                                required={required}
                                onChange={(
                                    e: ChangeEvent<HTMLInputElement>,
                                ) => {
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
                                    onClick={openImagePreview}
                                >
                                    Open image
                                </Link>
                            ) : (
                                <Link
                                    href={sourceValue}
                                    download
                                    rel="noreferrer"
                                >
                                    Download file
                                </Link>
                            )
                        ) : null}
                        {field.value instanceof File ? (
                            <Typography variant="body2">
                                Selected: {field.value.name}
                            </Typography>
                        ) : null}
                        {error?.message ? (
                            <Typography variant="caption" color="error">
                                {error.message}
                            </Typography>
                        ) : null}
                    </Stack>
                )}
            />
            <ImagePreviewDialog
                open={imagePreviewOpen}
                onClose={closeImagePreview}
                sourceValue={sourceValue}
                label={label}
            />
        </Stack>
    );
}
