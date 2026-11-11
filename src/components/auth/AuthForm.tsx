import { zodResolver } from "@hookform/resolvers/zod";
import { AccountCircle } from "@mui/icons-material";
import { Box, Button, FormControl, FormLabel } from "@mui/material";
import { z } from "zod";

import { RHFCheckbox, RHFFormProvider, RHFTextField, useRHFAction } from "@/components/rhf";
import { login, register } from "@/lib/safe/auth";
import { loginUserSchema, registerUserSchema } from "@/utils/validate/schemas";

type LoginFormValues = z.infer<typeof loginUserSchema>;
type RegisterFormValues = z.infer<typeof registerUserSchema>;

function SignInForm() {
    const { form, action, handleSubmitWithAction, resetFormAndAction } = useRHFAction(
        login,
        zodResolver(loginUserSchema),
        {
            formProps: {
                defaultValues: { email: "", password: "", remember: false },
            },
            actionProps: {
                onSuccess: () => {
                    resetFormAndAction();
                },
            },
        },
    );

    return (
        <RHFFormProvider {...form}>
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
                <FormControl>
                    <FormLabel htmlFor="email">Email</FormLabel>
                    <RHFTextField<LoginFormValues>
                        name="email"
                        autoComplete="email"
                        autoFocus
                        fullWidth
                        placeholder="tralalero@localhost.noreply"
                        required
                        type="email"
                        variant="outlined"
                    />
                </FormControl>

                <FormControl>
                    <FormLabel htmlFor="password">Password</FormLabel>
                    <RHFTextField<LoginFormValues>
                        name="password"
                        autoComplete="new-password"
                        fullWidth
                        placeholder="••••••"
                        required
                        type="password"
                        variant="outlined"
                    />
                </FormControl>

                <RHFCheckbox<LoginFormValues>
                    name="remember"
                    label="Remember me"
                    checkboxProps={{ color: "primary" }}
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
        </RHFFormProvider>
    );
}

function SignUpForm() {
    const { form, action, handleSubmitWithAction, resetFormAndAction } = useRHFAction(
        register,
        zodResolver(registerUserSchema),
        {
            formProps: {
                defaultValues: { name: "", email: "", password: "" },
            },
            actionProps: {
                onSuccess: () => {
                    resetFormAndAction();
                },
            },
        },
    );

    return (
        <RHFFormProvider {...form}>
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
                <FormControl>
                    <FormLabel htmlFor="name">Name</FormLabel>
                    <RHFTextField<RegisterFormValues>
                        name="name"
                        autoComplete="name"
                        autoFocus
                        fullWidth
                        placeholder="tralalero"
                        required
                        type="text"
                        variant="outlined"
                    />
                </FormControl>

                <FormControl>
                    <FormLabel htmlFor="email">Email</FormLabel>
                    <RHFTextField<RegisterFormValues>
                        name="email"
                        autoComplete="email"
                        autoFocus
                        fullWidth
                        placeholder="tralalero@localhost.noreply"
                        required
                        type="text"
                        variant="outlined"
                    />
                </FormControl>

                <FormControl>
                    <FormLabel htmlFor="password">Password</FormLabel>
                    <RHFTextField<RegisterFormValues>
                        name="password"
                        autoComplete="new-password"
                        fullWidth
                        placeholder="••••••"
                        required
                        type="password"
                        variant="outlined"
                    />
                </FormControl>

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
        </RHFFormProvider>
    );
}

/** Renders the authentication form for the selected mode. */
export default function AuthForm({ mode }: { mode: "signup" | "signin" }) {
    return mode === "signin" ? <SignInForm /> : <SignUpForm />;
}
