import { useState } from "react";
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    Stack,
    Typography,
} from "@mui/material";

type ImagePreviewDialogProps = {
    open: boolean;
    sourceValue: string;
    label: string;
    onClose: () => void;
};

type UseImagePreviewResult = {
    imagePreviewOpen: boolean;
    openImagePreview: () => void;
    closeImagePreview: () => void;
};

/**
 * Provides reusable state handlers for opening/closing image preview dialogs.
 */
export function useImagePreview(): UseImagePreviewResult {
    const [imagePreviewOpen, setImagePreviewOpen] = useState(false);

    /**
     * Opens the image preview dialog.
     */
    function openImagePreview(): void {
        setImagePreviewOpen(true);
    }

    /**
     * Closes the image preview dialog.
     */
    function closeImagePreview(): void {
        setImagePreviewOpen(false);
    }

    return {
        imagePreviewOpen,
        openImagePreview,
        closeImagePreview,
    };
}

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

/**
 * Displays an image preview dialog with a shared UI across file renderers.
 */
export function ImagePreviewDialog({ open, sourceValue, label, onClose }: ImagePreviewDialogProps) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>{label}</DialogTitle>
            <ImagePreviewContent
                key={`${open ? "open" : "closed"}-${sourceValue}`}
                sourceValue={sourceValue}
                label={label}
            />
        </Dialog>
    );
}
