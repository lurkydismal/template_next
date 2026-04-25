"use client";

import AuthCard from "@/components/auth/AuthCard";
import AuthForm from "@/components/auth/AuthForm";
import { Link } from "@/components/Link";
import { CopyrightAligned as Copyright } from "@/components/Copyright";
import log from "@/utils/stdlog";
import { useRouter } from "next/navigation";
import { Typography } from "@mui/material";
import { useEffect } from "react";
import { register } from "@/lib/auth";
import { useSnackbar } from "@/providers/snackbar";
import { setUser } from "@/utils/stduser";
import { afterLoginRoute } from "@/data/routes";

export default function SignUpPage() {
    const router = useRouter();
    const { showError } = useSnackbar();

    useEffect(() => {
        log.trace("SignUp component mounted");
        return () => {
            log.trace("SignUp component unmounted");
        };
    }, []);

    const handleSignUp = async (data: {
        username: string;
        password: string;
    }) => {
        log.trace(`onSubmit called: '${JSON.stringify(data)}'`);

        try {
            const user = await register({ ...data });

            setUser(user);

            router.push(afterLoginRoute);
        } catch (err) {
            showError(err);
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
            <AuthForm mode="signup" onSubmit={handleSignUp} />
        </AuthCard>
    );
}
