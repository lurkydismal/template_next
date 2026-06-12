import { zodResolver } from "@hookform/resolvers/zod";
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
import { Controller } from "react-hook-form";
import { useHookFormAction } from "@next-safe-action/adapter-react-hook-form/hooks";
import { login, register } from "@/lib/safe/auth";
import z from "zod";

export type SignInValues = z.infer<typeof loginUserSchema>;
export type SignUpValues = z.infer<typeof registerUserSchema>;

const registerUserSchema = z.object({ name: z.string(), email: z.email(), password: z.string() });
const loginUserSchema = z.object({ email: z.email(), password: z.string(), remember: z.boolean().optional() });

function SignInForm() {
    const { form, action, handleSubmitWithAction, resetFormAndAction } =
        useHookFormAction(login, zodResolver(loginUserSchema), {
            formProps: {
                defaultValues:
                    { email: "", password: "", remember: false }
            },
            actionProps: {
                onSuccess: () => {
                    resetFormAndAction();
                },
            },
        });
    const { control } = form;

    return (
        <Box
            component="form"
            noValidate
            onSubmit={handleSubmitWithAction}
            sx={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                width: "100%",
            }}
        >
            <Controller
                name="email"
                control={control}
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
                            placeholder="tralalero@localhost.noreply"
                            required
                            type="email"
                            variant="outlined"
                        />
                    </FormControl>
                )}
            />

            <Controller
                name="password"
                control={control}
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

            <Button
                endIcon={<AccountCircle />}
                fullWidth
                loading={action.isPending}
                type="submit"
                variant="outlined"
            >
                Sign in
            </Button>
        </Box>
    );
}


function SignUpForm() {
    const { form, action, handleSubmitWithAction, resetFormAndAction } = useHookFormAction(register, zodResolver(registerUserSchema), {
        formProps: {
            defaultValues:
                { name: "", email: "", password: "" },
        },
        actionProps: {
            onSuccess: () => {
                resetFormAndAction();
            },
        },
    });
    const { control } = form;

    return (
        <Box
            component="form"
            noValidate
            onSubmit={handleSubmitWithAction}
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

            <Controller
                name="email"
                control={control}
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
                            placeholder="tralalero@localhost.noreply"
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

            <Button
                endIcon={<AccountCircle />}
                fullWidth
                loading={action.isPending}
                type="submit"
                variant="outlined"
            >
                Sign up
            </Button>
        </Box>
    );
}

/**
 * Renders the auth form component.
 */
export default function AuthForm({ mode }: { mode: "signup" | "signin" }) {
    const isSignIn = mode === "signin";

    return (isSignIn ? <SignInForm /> : <SignUpForm />);
}
