import {
    Toolbar,
    GridToolbarProps,
    ToolbarPropsOverrides,
} from "@mui/x-data-grid";
import CustomDivider from "../CustomDivider";
import CustomQuickFilter from "./CustomQuickFilter";
import ExportMenu from "./ExportMenu";
import { ColumnsPanelButton, FiltersPanelButton } from "./PanelButtons";

type CustomToolbarProps = GridToolbarProps &
    ToolbarPropsOverrides & {
        extraButtons?: React.ReactNode;
    };

/**
 * Renders the custom toolbar component.
 */
export default function CustomToolbar({ extraButtons }: CustomToolbarProps) {
    return (
        <Toolbar>
            {extraButtons}

            <ColumnsPanelButton />
            <FiltersPanelButton />

            <CustomDivider />

            <ExportMenu />

            <CustomDivider />

            <CustomQuickFilter />
        </Toolbar>
    );
}
