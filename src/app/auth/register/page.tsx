"use client";

import AuthCard from "@/components/auth/AuthCard";
import AuthForm, { SignUpValues } from "@/components/auth/AuthForm";
import { Link } from "@/components/Link";
import { CopyrightAligned as Copyright } from "@/components/Copyright";
import log from "@/utils/stdlog";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { Typography } from "@mui/material";
import { register } from "@/lib/safe/auth";
import { useSnackbar } from "@/providers/snackbar";
import { afterLoginRoute } from "@/data/routes";

/**
 * Renders the sign up page component.
 */
export default function SignUpPage() {
    const { executeAsync, result, isExecuting } = useAction(register);
    const router = useRouter();
    const { showError } = useSnackbar();

    const handleSignUp = async (data: SignUpValues) => {
        log.trace(`onSubmit called: '${JSON.stringify(data)}'`);

        await executeAsync(data);

        if (result.data) {
            router.push(afterLoginRoute);
        } else if (result.validationErrors) {
            showError(result.validationErrors);
        } else if (result.serverError) {
            showError(result.serverError);
        }
    };

    const footer = (
        <>
            <Typography sx={{ textAlign: "center" }}>
                Already have an account?{" "}
                <Link
                    href="/auth/login"
                    sx={{ alignSelf: "center" }}
                    variant="body2"
                >
                    Sign in
                </Link>
            </Typography>

            <Copyright />
        </>
    );

    return (
        <AuthCard footer={footer}>
            <AuthForm mode="signup" onSubmit={handleSignUp} isExecuting={isExecuting} />
        </AuthCard>
    );
}
