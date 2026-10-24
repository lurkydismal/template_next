"use client";

import { Typography } from "@mui/material";

import AuthCard from "@/components/auth/AuthCard";
import AuthForm from "@/components/auth/AuthForm";
import { CopyrightAligned as Copyright } from "@/components/Copyright";
import { Link } from "@/components/Link";

/**
 * Renders the sign up page component.
 */
export default function SignUpPage() {
    const footer = (
        <>
            <Typography sx={{ textAlign: "center" }}>
                Already have an account?{" "}
                <Link href="/auth/login" sx={{ alignSelf: "center" }} variant="body2">
                    Sign in
                </Link>
            </Typography>

            <Copyright />
        </>
    );

    return (
        <AuthCard footer={footer}>
            <AuthForm mode="signup" />
        </AuthCard>
    );
}
