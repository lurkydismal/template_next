import { UsersRowPublic } from "@/db/types";
import { isServer, storageKeys } from "./stdvar";

export function setUser(user: UsersRowPublic | null) {
    if (isServer || !storageKeys.client) return;

    const storageKey = storageKeys.client.authStorageKey;

    if (user) localStorage.setItem(storageKey, JSON.stringify(user));
    else localStorage.removeItem(storageKey);
}

export function getUser() {
    if (isServer || !storageKeys.client) return null;

    const storageKey = storageKeys.client.authStorageKey;

    const stored = localStorage.getItem(storageKey);

    return stored ? JSON.parse(stored) : null;
}
