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
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

type SignInValues = {
    username: string;
    password: string;
    rememberMe?: boolean;
};

type SignUpValues = {
    username: string;
    password: string;
};

type Values = SignInValues | SignUpValues;

type Props =
    | {
          mode: "signin";
          onSubmit: (data: SignInValues) => Promise<void> | void;
      }
    | {
          mode: "signup";
          onSubmit: (data: SignUpValues) => Promise<void> | void;
      };

export default function AuthForm(props: Props) {
    const isSignIn = props.mode === "signin";
    const { control, handleSubmit } = useForm<Values>({
        defaultValues: isSignIn
            ? { username: "", password: "", rememberMe: false }
            : { username: "", password: "" },
    });
    const [loading, setLoading] = useState(false);

    const _onSubmit = async (data: Values) => {
        setLoading(true);

        try {
            await props.onSubmit(data);
        } finally {
            setLoading(false);
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
                name="username"
                control={control}
                rules={{ required: "Username is required", maxLength: 32 }}
                render={({ field, fieldState }) => (
                    <FormControl>
                        <FormLabel htmlFor="username">Username</FormLabel>

                        <TextField
                            {...field}
                            autoComplete="username"
                            autoFocus
                            color={
                                Boolean(fieldState.error) ? "error" : "primary"
                            }
                            error={Boolean(fieldState.error)}
                            fullWidth
                            helperText={fieldState.error?.message}
                            name="username"
                            placeholder="tralalero"
                            required
                            type="text"
                            variant="outlined"
                        />
                    </FormControl>
                )}
            />

            <Controller
                name="password"
                control={control}
                rules={{
                    required: "Password is required",
                    minLength:
                        props.mode === "signup"
                            ? { value: 8, message: "Min 8 characters" }
                            : undefined,
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
                    name="rememberMe"
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
                disabled={loading}
                type="submit"
                variant="outlined"
            >
                {isSignIn ? "Sign in" : "Sign up"}
            </Button>
        </Box>
    );
}
