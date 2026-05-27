"use client";

import CustomDivider from "@/components/TableDataGrid/CustomDivider";
import { useSnackbar } from "@/providers/snackbar";
import { isDev } from "@/utils/stdvar";
import uuid from "@/utils/uuid";
import {
    Queue as MockShowIcon,
    AddBoxOutlined as AddIcon,
    NotificationsOutlined as NotificationsIcon,
} from "@mui/icons-material";
import { Badge, List, ListItemButton, ListItemText, Popover, Tooltip } from "@mui/material";
import { ToolbarButton } from "@mui/x-data-grid";
import React, { useEffect, useState } from "react";

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
    type: "default" | "success" | "error" | "warning" | "info";
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
async function readNotifications(): Promise<{ rows: StoredNotification[]; unreadCount: number }> {
    const response = await fetch("/api/notifications", { cache: "no-store" });
    return response.json() as Promise<{ rows: StoredNotification[]; unreadCount: number }>;
}

/**
 * Marks notification IDs as read in the database.
 */
async function markNotifications(ids: number[], isRead: boolean): Promise<void> {
    await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, isRead }),
    });
}

/**
 * Persists one notification of a specific type for testing and SSE verification.
 */
async function createNotification(type: StoredNotification["type"], message: string): Promise<void> {
    await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, message }),
    });
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
    const { showError, showInfo } = useSnackbar();
    const [notifications, setNotifications] = useState<StoredNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    useEffect(() => {
        void readNotifications().then(({ rows, unreadCount: unread }) => {
            setNotifications(rows);
            setUnreadCount(unread);
        });

        const source = new EventSource("/api/dashboard/changes");
        source.onmessage = (event) => {
            const payload = JSON.parse(event.data) as { type?: string };
            if ((payload as { event?: string }).event !== "notification") return;

            void readNotifications().then(({ rows, unreadCount: unread }) => {
                setNotifications(rows);
                setUnreadCount(unread);
                showInfo("New notifications available");
            });
        };

        return () => source.close();
    }, [showInfo]);

    return (
        <>
            {isDev ? (
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
            ) : undefined}

            <Tooltip title="Notifications">
                <ToolbarButton onClick={(e) => setAnchorEl(e.currentTarget)}>
                    <Badge badgeContent={unreadCount} color="error">
                        <NotificationsIcon fontSize="small" />
                    </Badge>
                </ToolbarButton>
            </Tooltip>

            <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            >
                <List dense sx={{ minWidth: 360 }}>
                    {notifications.map((item) => (
                        <ListItemButton
                            key={item.id}
                            onClick={() => {
                                void markNotifications([item.id], item.is_read ? false : true)
                                    .then(() => readNotifications())
                                    .then(({ rows, unreadCount: unread }) => {
                                        setNotifications(rows);
                                        setUnreadCount(unread);
                                    })
                                    .catch(showError);
                            }}
                        >
                            <ListItemText
                                primary={`[${item.type}] ${item.message}`}
                                secondary={item.is_read ? "read" : "unread"}
                            />
                        </ListItemButton>
                    ))}
                </List>
            </Popover>

            <Tooltip title="Add new row">
                <ToolbarButton
                    onClick={() => {
                        if (isDialogCreateAction(createRowAction)) {
                            createRowAction.action();
                        } else if (emptyRow) {
                            createRowAction.action(emptyRow).catch((err) => {
                                showError(`Failed to create row: ${err.message}`);
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
