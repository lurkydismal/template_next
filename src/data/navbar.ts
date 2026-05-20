type Position = "left" | "right";

export interface NavItem {
    name: string;
    href: string;
    position: Position;
    badge?: boolean;
}

export const items: NavItem[] = [
    {
        name: "This Current Table",
        href: "/dashboard/table",
        position: "left",
    },
    {
        name: "The Very Same Table",
        href: "/dashboard/table",
        position: "right",
    },
];
