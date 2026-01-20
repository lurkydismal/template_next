import { ButtonDefinition } from "@/components/RootPageButton";

// Configuration list for buttons displayed on the main page
// Each entry defines the button label, MUI color variant, and navigation target
const buttons: ButtonDefinition[] = [
    {
        name: "Table",
        color: "primary",
        href: "/dashboard/table",
    },
];

export default buttons;
