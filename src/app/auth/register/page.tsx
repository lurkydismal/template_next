"use client";

import AuthCard from "@/components/auth/AuthCard";
import AuthForm from "@/components/auth/AuthForm";
import { Link } from "@/components/Link";
import { CopyrightAligned as Copyright } from "@/components/Copyright";
import { Typography } from "@mui/material";

/**
 * Renders the sign up page component.
 */
export default function SignUpPage() {
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
            <AuthForm mode="signup" />
        </AuthCard>
    );
}
