type Position = "left" | "right";

export interface NavItem {
    name: string;
    href: string;
    position: Position;
    badge?: boolean;
}

export const items: NavItem[] = [
    {
        name: "Bans",
        href: "/bans",
        position: "left",
    },
    {
        name: "Logs",
        href: "/logs",
        position: "right",
    },
];
