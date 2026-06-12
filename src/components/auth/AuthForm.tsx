import { AccountCircle } from "@mui/icons-material";
import {
    Box,
    FormControl,
    FormLabel,
    TextField,
    FormControlLabel,
    Checkbox,
    Button,
} from "@mui/material";
import { Controller, useForm } from "react-hook-form";

export type SignInValues = {
    email: string;
    password: string;
    remember?: boolean;
};

export type SignUpValues = {
    name: string;
    email: string;
    password: string;
};

type Values = SignInValues | SignUpValues;

// * TODO: Improve isExecuting
type Props =
    | {
        mode: "signin";
        onSubmit: (data: SignInValues) => Promise<void> | void;
        isExecuting: boolean;
    }
    | {
        mode: "signup";
        onSubmit: (data: SignUpValues) => Promise<void> | void;
        isExecuting: boolean;
    };

/**
 * Renders the auth form component.
 */
export default function AuthForm(props: Props) {
    const isSignIn = props.mode === "signin";
    const { control, handleSubmit } = useForm<Values>({
        defaultValues: isSignIn
            ? { email: "", password: "", remember: false }
            : { name: "", email: "", password: "" },
    });

    /**
     * Submits the current form or dialog state.
     */
    const _onSubmit = async (data: Values) => {
        if (isSignIn) {
            await props.onSubmit(data as SignInValues);
        } else {
            await props.onSubmit(data as SignUpValues);
        }
    };

    return (
        <Box
            component="form"
            noValidate
            onSubmit={handleSubmit(_onSubmit)}
            sx={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                width: "100%",
            }}
        >
            <Controller
                name="name"
                control={control}
                rules={{ required: "Name is required", maxLength: 32 }}
                render={({ field, fieldState }) => (
                    <FormControl>
                        <FormLabel htmlFor="name">Name</FormLabel>

                        <TextField
                            {...field}
                            autoComplete="name"
                            autoFocus
                            color={
                                Boolean(fieldState.error) ? "error" : "primary"
                            }
                            error={Boolean(fieldState.error)}
                            fullWidth
                            helperText={fieldState.error?.message}
                            name="name"
                            placeholder="tralalero"
                            required
                            type="text"
                            variant="outlined"
                        />
                    </FormControl>
                )}
            />

            {!isSignIn ? (
                <Controller
                    name="email"
                    control={control}
                    rules={{ required: "Email is required", maxLength: 32 }}
                    render={({ field, fieldState }) => (
                        <FormControl>
                            <FormLabel htmlFor="email">Email</FormLabel>

                            <TextField
                                {...field}
                                autoComplete="email"
                                autoFocus
                                color={
                                    Boolean(fieldState.error) ? "error" : "primary"
                                }
                                error={Boolean(fieldState.error)}
                                fullWidth
                                helperText={fieldState.error?.message}
                                name="email"
                                placeholder="tralalero"
                                required
                                type="text"
                                variant="outlined"
                            />
                        </FormControl>
                    )}
                />
            ) : null}

            <Controller
                name="password"
                control={control}
                rules={{
                    required: "Password is required",
                    ...(props.mode === "signup"
                        ? {
                            minLength: {
                                value: 8,
                                message: "Min 8 characters",
                            },
                        }
                        : {}),
                    maxLength: 32,
                }}
                render={({ field, fieldState }) => (
                    <FormControl>
                        <FormLabel htmlFor="password">Password</FormLabel>

                        <TextField
                            {...field}
                            autoComplete="new-password"
                            color={
                                Boolean(fieldState.error) ? "error" : "primary"
                            }
                            error={Boolean(fieldState.error)}
                            fullWidth
                            helperText={fieldState.error?.message}
                            name="password"
                            placeholder="••••••"
                            required
                            type="password"
                            variant="outlined"
                        />
                    </FormControl>
                )}
            />

            {isSignIn && (
                <Controller
                    name="remember"
                    control={control}
                    render={({ field }) => (
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={Boolean(field.value)}
                                    onChange={(e) =>
                                        field.onChange(e.target.checked)
                                    }
                                    color="primary"
                                />
                            }
                            label="Remember me"
                        />
                    )}
                />
            )}

            <Button
                endIcon={<AccountCircle />}
                fullWidth
                disabled={props.isExecuting}
                type="submit"
                variant="outlined"
            >
                {isSignIn ? "Sign in" : "Sign up"}
            </Button>
        </Box>
    );
}
