"use client";

import type { CloseReason, SnackbarKey } from "notistack";

import {
    Queue as MockShowIcon,
    AddBoxOutlined as AddIcon,
    NotificationsOutlined as NotificationsIcon,
} from "@mui/icons-material";
import { Badge, Tooltip } from "@mui/material";
import { ToolbarButton } from "@mui/x-data-grid";
import { useCallback, useEffect, useState } from "react";

import type { NotificationsRow } from "@/db/types";

import CustomDivider from "@/components/TableDataGrid/CustomDivider";
import { useDashboardEventStream } from "@/lib/dashboard/client-events";
import { useSnackbar } from "@/providers/snackbar";
import { getErrorMessage, UserFacingError } from "@/utils/errors";
import { userMessages } from "@/utils/messages";
import { isDev, maxSnackbarCount } from "@/utils/stdvar";
import uuid from "@/utils/uuid";

type DialogCreateRowAction = {
    type: "dialog";
    action: () => void;
};

type DirectCreateRowAction<RI extends Record<string, unknown>> = {
    type: "direct";
    action: (row: RI) => Promise<void>;
};

type CreateRowAction<RI extends Record<string, unknown>> =
    | DialogCreateRowAction
    | DirectCreateRowAction<RI>;

type StoredNotification = {
    id: number;
    type: NotificationsRow["type"];
    message: string;
    is_read: boolean;
};

function isDialogCreateAction<RI extends Record<string, unknown>>(
    createRowAction: CreateRowAction<RI>,
): createRowAction is DialogCreateRowAction {
    return createRowAction.type === "dialog";
}

/**
 * Reads notifications from the API to restore UI state after reload.
 */
async function readNotifications(): Promise<{
    rows: StoredNotification[];
    unreadCount: number;
}> {
    try {
        const response = await fetch("/api/notifications", { cache: "no-store" });
        if (!response.ok) {
            throw new UserFacingError(userMessages.errors.notificationsLoad);
        }
        return (await response.json()) as {
            rows: StoredNotification[];
            unreadCount: number;
        };
    } catch (error) {
        if (error instanceof UserFacingError) throw error;
        throw new UserFacingError(userMessages.errors.notificationsLoad, { cause: error });
    }
}

/**
 * Marks notification IDs as read in the database.
 */
async function markNotifications(ids: number[], isRead: boolean): Promise<void> {
    try {
        const response = await fetch("/api/notifications", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids, isRead }),
        });
        if (!response.ok) {
            throw new UserFacingError(userMessages.errors.notificationsUpdate);
        }
    } catch (error) {
        if (error instanceof UserFacingError) throw error;
        throw new UserFacingError(userMessages.errors.notificationsUpdate, { cause: error });
    }
}

/**
 * Persists one notification of a specific type for testing and SSE verification.
 */
async function createNotification(
    type: StoredNotification["type"],
    message: string,
): Promise<void> {
    try {
        const response = await fetch("/api/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type, message }),
        });
        if (!response.ok) {
            throw new UserFacingError(userMessages.errors.notificationsCreate);
        }
    } catch (error) {
        if (error instanceof UserFacingError) throw error;
        throw new UserFacingError(userMessages.errors.notificationsCreate, { cause: error });
    }
}

/**
 * Returns only notifications that have not already been read.
 */
function getUnreadNotifications(notifications: StoredNotification[]) {
    return notifications.filter((item) => !item.is_read);
}

/**
 * Sends one stored notification through the snackbar variant matching its type.
 */
function showStoredNotification(
    notification: StoredNotification,
    snackbar: ReturnType<typeof useSnackbar>,
    onDismiss: (notificationId: number) => void,
) {
    const handleSnackbarClose = (_event: unknown, reason: CloseReason, key?: SnackbarKey) => {
        if (reason === "instructed" && key !== undefined) {
            onDismiss(notification.id);
        }
    };

    const options = {
        persist: true,
        onClose: handleSnackbarClose,
    };

    const actions: Record<StoredNotification["type"], (msg: string, opts: typeof options) => void> =
        {
            success: snackbar.showSuccess,
            error: snackbar.showError,
            warning: snackbar.showWarning,
            info: snackbar.showInfo,
            default: snackbar.showMessage,
        };

    (actions[notification.type] ?? snackbar.showMessage)(notification.message, options);
}

/**
 * Renders extra data-grid toolbar actions including notifications center.
 */
export default function ExtraToolbarButtons<RI extends Record<string, unknown>>({
    emptyRow,
    createRowAction,
}: Readonly<{
    emptyRow?: RI;
    createRowAction: CreateRowAction<RI>;
}>) {
    const snackbar = useSnackbar();
    const { showError, showInfo, showMessage, showSuccess, showWarning } = snackbar;

    const [notifications, setNotifications] = useState<StoredNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [visibleUnreadIds, setVisibleUnreadIds] = useState<number[]>([]);

    const hiddenUnreadCount = Math.max(unreadCount - visibleUnreadIds.length, 0);

    const syncNotifications = useCallback(async (dismissedId?: number) => {
        const { rows, unreadCount: unread } = await readNotifications();
        setNotifications(rows);
        setUnreadCount(unread);

        if (dismissedId !== undefined) {
            setVisibleUnreadIds((current) => current.filter((id) => id !== dismissedId));
        }
    }, []);

    /**
     * Marks one notification as read after the user explicitly dismisses it.
     */
    const handleNotificationDismiss = useCallback(
        (notificationId: number) => {
            void markNotifications([notificationId], true)
                .then(() => syncNotifications(notificationId))
                .catch(showError);
        },
        [showError, syncNotifications],
    );

    const handleShowUnreadNotifications = useCallback(() => {
        const unreadNotifications = getUnreadNotifications(notifications);
        const notYetVisible = unreadNotifications.filter(
            (item) => !visibleUnreadIds.includes(item.id),
        );

        const remainingSlots = Math.max(maxSnackbarCount - visibleUnreadIds.length, 0);

        const toShow = notYetVisible.slice(0, remainingSlots);

        toShow.forEach((item) => showStoredNotification(item, snackbar, handleNotificationDismiss));

        if (toShow.length > 0) {
            setVisibleUnreadIds((current) => [...current, ...toShow.map((item) => item.id)]);
        }
    }, [notifications, visibleUnreadIds, snackbar, handleNotificationDismiss]);

    useEffect(() => {
        // Load persisted state independently of the stream's initial connection.
        void syncNotifications().catch(showError);
    }, [syncNotifications, showError]);

    const handleStreamEvent = useCallback(
        (payload: { event?: string }) => {
            if (payload.event !== "notification") return;

            void syncNotifications()
                .then(() => {
                    showInfo(userMessages.notifications.newAvailable);
                })
                .catch(showError);
        },
        [syncNotifications, showInfo, showError],
    );

    const handleReconnect = useCallback(() => {
        // Re-fetch persisted notifications to cover events missed offline.
        void syncNotifications().catch(showError);
    }, [syncNotifications, showError]);

    useDashboardEventStream({ onEvent: handleStreamEvent, onReconnect: handleReconnect });

    return (
        <>
            {isDev ? (
                <>
                    <Tooltip title="Show nock snackbars">
                        <ToolbarButton
                            onClick={() => {
                                showMessage(uuid());
                                showSuccess(uuid());
                                showError(uuid());
                                showWarning(uuid());
                                showInfo(uuid());
                            }}
                        >
                            <MockShowIcon fontSize="small" />
                        </ToolbarButton>
                    </Tooltip>

                    <Tooltip title="Send mock notifications">
                        <ToolbarButton
                            onClick={() => {
                                void Promise.all([
                                    createNotification("default", `default-${uuid()}`),
                                    createNotification("success", `success-${uuid()}`),
                                    createNotification("error", `error-${uuid()}`),
                                    createNotification("warning", `warning-${uuid()}`),
                                    createNotification("info", `info-${uuid()}`),
                                ]).catch(showError);
                            }}
                        >
                            <MockShowIcon fontSize="small" />
                        </ToolbarButton>
                    </Tooltip>

                    <CustomDivider />
                </>
            ) : undefined}

            <Tooltip title="Notifications">
                <ToolbarButton onClick={handleShowUnreadNotifications}>
                    <Badge badgeContent={hiddenUnreadCount} color="info" variant="dot">
                        <NotificationsIcon fontSize="small" />
                    </Badge>
                </ToolbarButton>
            </Tooltip>

            <Tooltip title="Add new row">
                <ToolbarButton
                    onClick={() => {
                        if (isDialogCreateAction(createRowAction)) {
                            createRowAction.action();
                        } else if (emptyRow) {
                            createRowAction.action(emptyRow).catch((err) => {
                                showError(getErrorMessage(err, userMessages.errors.rowCreate));
                            });
                        }
                    }}
                >
                    <AddIcon fontSize="small" />
                </ToolbarButton>
            </Tooltip>

            <CustomDivider />
        </>
    );
}
