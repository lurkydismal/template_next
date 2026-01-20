import NextImage from "next/image";
import {
    Dialog,
    Box,
    Typography,
    Button,
    CircularProgress,
    Alert,
} from "@mui/material";
import { ErrorOutline as ErrorIcon } from "@mui/icons-material";
import {
    Dispatch,
    SetStateAction,
    startTransition,
    useActionState,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { validateUploadInput } from "@/utils/validate";
import log from "@/utils/stdlog";
import { uploadAction } from "@/lib/upload";
import { ActionResult } from "@/lib/types";

function getFilename(id: number) {
    return `${id}`;
}

export default function RowImageDialog({
    id,
    src,
    alt,
    open,
    setOpen,
    ...props
}: {
    id: number;
    src: string;
    alt?: string;
    open: boolean;
    setOpen: Dispatch<SetStateAction<boolean>>;
}) {
    const [failed, setFailed] = useState(false);
    const fileRef = useRef<HTMLInputElement | null>(null);
    const [state, formAction, pending] = useActionState(
        (state: ActionResult | undefined, formData: FormData) => {
            return uploadAction(formData);
        },
        {
            ok: false, error: "",
        },
    );

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const form = e.currentTarget.form;
        if (!form) return;

        // get filename from hidden input
        const raw = (form.elements.namedItem("filename") as HTMLInputElement)
            ?.value;

        try {
            const { filename: sanitized } = await validateUploadInput({
                filename: raw,
                file,
            });
            // show preview / send to server
            log.info("Sanitized filename:", sanitized);

            e.currentTarget.form?.requestSubmit();
        } catch (err) {
            // handle validation error (ZodError)
            log.error(err);
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) {
            return;
        }

        const file = e.dataTransfer.files[0];
        if (!file) return;

        // get filename from hidden input
        const raw = getFilename(id);

        try {
            const { filename: sanitized } = await validateUploadInput({
                filename: raw,
                file,
            });
            // show preview / send to server
            log.info("Sanitized filename:", sanitized);

            const fd = new FormData();
            fd.append("filename", `${id}-act`);
            fd.append("image", file);

            startTransition(() => {
                (async () => {
                    formAction(fd);
                })();
            });
        } catch (err) {
            // handle validation error (ZodError)
            log.error(err);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    return (
        <Dialog
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            open={open}
            onClose={() => setOpen(false)}
            maxWidth={false}
            slotProps={{
                paper: {
                    sx: {
                        background: "transparent",
                        boxShadow: "none",
                    },
                },
            }}
        >
            <Box
                sx={{
                    m: 4, // margin from window corners
                    maxWidth: "calc(100vw - 64px)",
                    maxHeight: "calc(100vh - 64px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                {failed ? (
                    <form action={formAction}>
                        <Box
                            sx={{
                                textAlign: "center",
                                width: 600,
                                maxWidth: "100%",
                            }}
                        >
                            <Typography variant="h6" gutterBottom>
                                {failed
                                    ? "Image not found"
                                    : "Not an image"}
                            </Typography>
                            <Typography color="text.secondary" sx={{ mb: 2 }}>
                                {failed
                                    ? "Image returned error 404 or failed to load. You can load an image as replacement."
                                    : "No image. Upload it if you want it here."}
                            </Typography>

                            <input
                                type="hidden"
                                name="filename"
                                value={getFilename(id)}
                            />

                            <input
                                ref={fileRef}
                                name="image"
                                type="file"
                                accept="image/jpg"
                                onChange={handleFile}
                                className="hidden"
                            />

                            <Button
                                variant="contained"
                                onClick={() => fileRef.current?.click()}
                                disabled={pending}
                                sx={{ mr: 1 }}
                            >
                                {pending ? (
                                    <CircularProgress size={18} />
                                ) : (
                                    "Upload image"
                                )}
                            </Button>

                            {!state.ok && state?.error.length ? (
                                <Alert
                                    aria-live="polite"
                                    icon={<ErrorIcon fontSize="inherit" />}
                                    variant="outlined"
                                    severity="error"
                                    sx={{
                                        color: "white",
                                        fontSize: "1.125rem",
                                    }}
                                    className="mt-4 mr-5 flex text-center items-center justify-center"
                                >
                                    {state.error}
                                </Alert>
                            ) : null}
                        </Box>
                    </form>
                ) : (
                    <NextImage
                        key={src}
                        width={1600}
                        height={900}
                        {...props}
                        src={src}
                        alt={alt ?? ""}
                        style={{
                            width: "100%",
                            objectFit: "contain",
                        }}
                        priority={false}
                        onError={() => setFailed(true)}
                        onLoadingComplete={() => {
                            setFailed(false);
                        }}
                    />
                )}
            </Box>
        </Dialog>
    );
}
