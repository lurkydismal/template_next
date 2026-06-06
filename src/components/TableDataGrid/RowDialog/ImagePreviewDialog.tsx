import NextImage from "next/image";
import { DragEvent, useEffect, useState, useTransition } from "react";
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
import { getFileAction } from "@/lib/getFile";
import log from "@/utils/stdlog";

type ImagePreviewDialogProps = {
    open: boolean;
    sourceValue: string;
    label: string;
    onClose: () => void;
    onFileDrop?: (file: File) => void;
    accept?: string;
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
function ImagePreviewContent({
    sourceValue,
    label,
}: {
    sourceValue: string;
    label: string;
}) {
    const [isLoadingPreview, setIsLoadingPreview] = useState(true);
    const [hasPreviewError, setHasPreviewError] = useState(false);
    const [imageRetryKey, setImageRetryKey] = useState(0);
    const [resolvedSourceValue, setResolvedSourceValue] = useState<
        string | null
    >(null);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        startTransition(async () => {
            const value = await getFileAction(
                "tables",
                sourceValue,
            );

            if (value.ok) {
                setResolvedSourceValue(value.data);
            }
        });
    }, [sourceValue]);

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

    log.debug({ isLoadingPreview, hasPreviewError, imageRetryKey, resolvedSourceValue, isPending });

    return (
        <DialogContent>
            {isLoadingPreview || isPending ? (
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "center",
                        py: 4,
                    }}
                >
                    <CircularProgress aria-label="Loading image preview" />
                </Box>
            ) : null}
            {!isLoadingPreview && hasPreviewError && resolvedSourceValue ? (
                <Stack
                    sx={{
                        spacing: 1,
                        alignItems: "flex-start",
                        py: 2,
                    }}
                >
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
                            href={resolvedSourceValue}
                            target="_blank"
                            rel="noreferrer"
                        >
                            Open in new tab
                        </Button>
                    </Stack>
                </Stack>
            ) : null}
            {!hasPreviewError && resolvedSourceValue && !isPending ? (
                <NextImage
                    key={`${sourceValue}-${imageRetryKey}`}
                    src={resolvedSourceValue}
                    alt={label}
                    onLoad={handlePreviewLoad}
                    onError={handlePreviewError}
                    width={800}
                    height={600}
                    style={{
                        width: "100%",
                        height: "auto",
                        display: false ? "none" : "block",
                    }}
                />
            ) : null}
        </DialogContent>
    );
}

/**
 * Displays an image preview dialog with a shared UI across file renderers.
 */
export function ImagePreviewDialog({
    open,
    sourceValue,
    label,
    onClose,
    onFileDrop,
    accept,
}: ImagePreviewDialogProps) {
    /**
     * Resolves whether a dropped file should be accepted for upload.
     */
    function isAcceptedFile(file: File): boolean {
        if (!accept?.trim()) return true;

        const acceptedTypes = accept
            .split(",")
            .map((part) => part.trim().toLowerCase())
            .filter(Boolean);

        if (acceptedTypes.length === 0) return true;

        const fileName = file.name.toLowerCase();
        const mimeType = file.type.toLowerCase();

        return acceptedTypes.some((acceptedType) => {
            if (acceptedType.startsWith(".")) {
                return fileName.endsWith(acceptedType);
            }

            if (acceptedType.endsWith("/*")) {
                const prefix = acceptedType.slice(0, -1);
                return mimeType.startsWith(prefix);
            }

            return mimeType === acceptedType;
        });
    }

    /**
     * Handles files dropped onto the preview dialog as an upload shortcut.
     */
    function handleDrop(event: DragEvent<HTMLDivElement>): void {
        event.preventDefault();

        if (!onFileDrop) return;

        const droppedFile = event.dataTransfer.files?.[0];
        if (!droppedFile || !isAcceptedFile(droppedFile)) return;

        onFileDrop(droppedFile);
    }

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
        >
            <ImagePreviewContent
                key={`${open ? "open" : "closed"}-${sourceValue}`}
                sourceValue={sourceValue}
                label={label}
            />
        </Dialog>
    );
}
