import "server-only";
import { betterAuth } from "@next-safe-action/adapter-better-auth";
import auth from "@/lib/auth";
import { actionClient } from "@/lib/safe/client";

// Authenticated action client
export const authClient = actionClient.use(betterAuth(auth));