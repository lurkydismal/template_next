import { UsersRowPublic } from "@/db/types";
import { isServer, storageKeys } from "./stdvar";

/**
 * Persist the authenticated user payload into browser storage.
 *
 * - No-op during server execution.
 * - Removes storage entry when `user` is `null`.
 *
 * @example
 * setUser({ id: 1, login: "alice" } as UsersRowPublic);
 * setUser(null); // clears stored user
 */
export function setUser(user: UsersRowPublic | null) {
    if (isServer || !storageKeys.client) return;

    const storageKey = storageKeys.client.authStorageKey;

    if (user) localStorage.setItem(storageKey, JSON.stringify(user));
    else localStorage.removeItem(storageKey);
}

/**
 * Read the authenticated user payload from browser storage.
 *
 * - Returns `null` on the server.
 * - Returns `null` when there is no stored user.
 *
 * @example
 * const current = getUser();
 * if (current) console.log(current.login);
 */
export function getUser() {
    if (isServer || !storageKeys.client) return null;

    const storageKey = storageKeys.client.authStorageKey;

    const stored = localStorage.getItem(storageKey);

    return stored ? JSON.parse(stored) : null;
}
