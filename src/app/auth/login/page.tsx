"use client";

import { Typography } from "@mui/material";

import AuthCard from "@/components/auth/AuthCard";
import AuthForm from "@/components/auth/AuthForm";
import { CopyrightAligned as Copyright } from "@/components/Copyright";
import { Link } from "@/components/Link";

/**
 * Renders the sign in page component.
 */
export default function SignInPage() {
    const footer = (
        <>
            <Typography sx={{ textAlign: "center" }}>
                Don&apos;t have an account?{" "}
                <Link href="/auth/register" sx={{ alignSelf: "center" }} variant="body2">
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
