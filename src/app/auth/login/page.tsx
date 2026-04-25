"use client";

import AuthCard from "@/components/auth/AuthCard";
import AuthForm from "@/components/auth/AuthForm";
import { Link } from "@/components/Link";
import { CopyrightAligned as Copyright } from "@/components/Copyright";
import log from "@/utils/stdlog";
import { useRouter } from "next/navigation";
import { Typography } from "@mui/material";
import { useEffect } from "react";
import { login } from "@/lib/auth";
import { useSnackbar } from "@/providers/snackbar";
import { UsersRowPublic } from "@/db/types";
import { setUser } from "@/utils/stduser";

export default function SignInPage() {
    const router = useRouter();
    const { showError } = useSnackbar();

    useEffect(() => {
        log.trace("SignIn component mounted");
        return () => {
            log.trace("SignIn component unmounted");
        };
    }, []);

    const handleSignIn = async (data: {
        username: string;
        password: string;
        rememberMe?: boolean;
    }) => {
        log.trace(`onSubmit called: '${JSON.stringify(data)}'`);

        try {
            const user: UsersRowPublic = await login({ ...data });

            setUser(user);

            router.push("/posts");
        } catch (err) {
            showError(err);
        }
    };

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
            <AuthForm mode="signin" onSubmit={handleSignIn} />
        </AuthCard>
    );
}
