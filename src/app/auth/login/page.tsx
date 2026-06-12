"use client";

import AuthCard from "@/components/auth/AuthCard";
import AuthForm from "@/components/auth/AuthForm";
import { Link } from "@/components/Link";
import { CopyrightAligned as Copyright } from "@/components/Copyright";
import { Typography } from "@mui/material";

/**
 * Renders the sign in page component.
 */
export default function SignInPage() {
    const footer = (
        <>
            <Typography sx={{ textAlign: "center" }}>
                Don&apos;t have an account?{" "}
                <Link
                    href="/auth/register"
                    sx={{ alignSelf: "center" }}
                    variant="body2"
                >
                    Sign up
                </Link>
            </Typography>

            <Copyright />
        </>
    );

    return (
        <AuthCard footer={footer}>
            <AuthForm mode="signin" />
        </AuthCard>
    );
}
