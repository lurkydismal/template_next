import { ChangeEvent, useMemo, useState } from "react";
import {
    Preview as PreviewIcon,
    Subject as SubjectIcon,
} from "@mui/icons-material";
import { Box, IconButton, TextField, Tooltip, Typography } from "@mui/material";
import Markdown from "@/components/Markdown";
import {
    Control,
    Controller,
    FieldError,
    RegisterOptions,
} from "react-hook-form";
import { FieldConfig } from "./types";

type MarkdownToggleCorner = NonNullable<
    FieldConfig<unknown, unknown>["markdownToggleCorner"]
>;

type MarkdownFieldInputProps = {
    fieldKey: string;
    label: string;
    name: string;
    required: boolean;
    readOnly?: boolean;
    value: unknown;
    control: Control<Record<string, unknown>>;
    error?: FieldError | undefined;
    rules?: RegisterOptions<Record<string, unknown>, string>;
    toggleCorner?: MarkdownToggleCorner | undefined;
    onValueChange: (value: string) => void;
};

/**
 * Returns absolute-position styles for the markdown preview toggle button.
 */
function getTogglePositionStyles(corner: MarkdownToggleCorner) {
    const sharedStyles = { m: 0.5, position: "absolute" as const, zIndex: 1 };

    if (corner === "top-left") return { ...sharedStyles, left: 0, top: 0 };
    if (corner === "bottom-left")
        return { ...sharedStyles, bottom: 0, left: 0 };
    if (corner === "bottom-right")
        return { ...sharedStyles, bottom: 0, right: 0 };
    return { ...sharedStyles, right: 0, top: 0 };
}

/**
 * Renders a markdown field that can be toggled between text edit and markdown preview modes.
 */
export default function MarkdownFieldInput({
    fieldKey,
    label,
    name,
    required,
    readOnly = false,
    value,
    control,
    error,
    rules,
    toggleCorner = "top-right",
    onValueChange,
}: MarkdownFieldInputProps) {
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const togglePositionStyles = useMemo(
        () => getTogglePositionStyles(toggleCorner),
        [toggleCorner],
    );

    return (
        <div>
            <Typography variant="subtitle1" color="text.secondary">
                {label}
            </Typography>
            <Controller
                name={name}
                control={control}
                defaultValue={value ?? ""}
                rules={{ ...(rules ? rules : {}) }}
                disabled={readOnly}
                render={({ field }) => (
                    <Box sx={{ position: "relative" }}>
                        <Tooltip
                            title={
                                isPreviewMode
                                    ? "Switch to edit"
                                    : "Preview markdown"
                            }
                        >
                            <IconButton
                                size="small"
                                aria-label={
                                    isPreviewMode
                                        ? "Switch to text edit mode"
                                        : "Switch to markdown preview mode"
                                }
                                onClick={() =>
                                    setIsPreviewMode((prev) => !prev)
                                }
                                sx={togglePositionStyles}
                            >
                                {isPreviewMode ? (
                                    <SubjectIcon fontSize="small" />
                                ) : (
                                    <PreviewIcon fontSize="small" />
                                )}
                            </IconButton>
                        </Tooltip>

                        {isPreviewMode ? (
                            <>
                                <Box
                                    id={`${fieldKey}-markdown-preview`}
                                    sx={{
                                        border: 1,
                                        borderColor: error
                                            ? "error.main"
                                            : "divider",
                                        borderRadius: 1,
                                        minHeight: 120,
                                        p: 2,
                                        whiteSpace: "normal",
                                    }}
                                >
                                    <Markdown>
                                        {String(field.value ?? "")}
                                    </Markdown>
                                </Box>
                                {error?.message && (
                                    <Typography
                                        variant="caption"
                                        color="error"
                                        sx={{ mt: 0.5, display: "block" }}
                                    >
                                        {error.message}
                                    </Typography>
                                )}
                            </>
                        ) : (
                            <TextField
                                {...field}
                                required={required}
                                slotProps={{ htmlInput: { readOnly } }}
                                id={`${fieldKey}-markdown`}
                                value={field.value ?? ""}
                                onChange={(
                                    e: ChangeEvent<HTMLInputElement>,
                                ) => {
                                    if (readOnly) return;
                                    field.onChange(e.target.value);
                                    onValueChange(e.target.value);
                                }}
                                multiline
                                fullWidth
                                minRows={4}
                                maxRows={8}
                                error={!!error}
                                helperText={error?.message}
                            />
                        )}
                    </Box>
                )}
            />
        </div>
    );
}
