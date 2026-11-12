// @vitest-environment jsdom
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { act, fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/providers/snackbar", () => ({
    useSnackbar: () => ({ showError: vi.fn(), showWarning: vi.fn(), showInfo: vi.fn() }),
}));
vi.mock("next/offline", () => ({ useOffline: () => false }));

import type { FieldConfig } from "../src/components/TableDataGrid/RowDialog/types";

import RowDialogForm from "../src/components/TableDataGrid/RowDialog/rhf/RowDialogForm";
import demoFields from "../src/data/dashboard/tables/fields";

type Row = Record<string, unknown>;

/** Mirrors GridView: a create row is seeded from each field's placeholder. */
function emptyRowFor(fields: FieldConfig<Row, Row>[]): Row {
    return Object.fromEntries(
        fields.map((field) => [
            field.key,
            field.type !== "boolean" && field.type !== "radio-group"
                ? (field.placeholder ?? null)
                : null,
        ]),
    );
}

function setup(fields: FieldConfig<Row, Row>[], row: Row = emptyRowFor(fields)) {
    let submit: (() => Promise<boolean>) | null = null;
    const createRowAction = vi.fn().mockResolvedValue(undefined);
    const view = render(
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <RowDialogForm
                row={row}
                fields={fields}
                dashboardKey="tables"
                registerSubmit={(fn) => {
                    if (fn) submit = fn;
                }}
                registerDiscardDraft={() => undefined}
                createRowAction={createRowAction}
                updateRowAction={vi.fn()}
            />
        </LocalizationProvider>,
    );
    const run = async () => {
        let ok = false;
        await act(async () => {
            ok = await submit!();
        });
        return ok;
    };
    const errors = () =>
        Array.from(view.container.querySelectorAll("[id$=helper-text]")).map((e) => e.textContent);
    return { ...view, createRowAction, run, errors };
}

beforeEach(() => vi.clearAllMocks());

describe("row dialog — creating a row", () => {
    const fields = demoFields as unknown as FieldConfig<Row, Row>[];

    it("accepts a required field that keeps its default value", async () => {
        const { run, errors, createRowAction } = setup(fields);

        expect(await run()).toBe(true);
        expect(errors().join("")).not.toContain("is required");
        expect(createRowAction).toHaveBeenCalledTimes(1);
        expect(createRowAction.mock.calls[0]![0]).toMatchObject({
            multiline_field: "Required multiline content",
        });
    });

    it("still reports a required field that the user clears", async () => {
        const { container, run, errors, createRowAction } = setup(fields);
        const textarea = container.querySelector("textarea[id^=multiline_field]")!;

        fireEvent.change(textarea, { target: { value: "" } });

        expect(await run()).toBe(false);
        expect(errors()).toContain("Multiline is required");
        expect(createRowAction).not.toHaveBeenCalled();
    });

    it("submits an edited value under the field key", async () => {
        const { container, run, createRowAction } = setup(fields);
        const textarea = container.querySelector("textarea[id^=multiline_field]")!;

        fireEvent.change(textarea, { target: { value: "edited" } });

        expect(await run()).toBe(true);
        expect(createRowAction.mock.calls[0]![0]).toMatchObject({ multiline_field: "edited" });
    });

    it("is not affected by a field `name` that differs from its key", async () => {
        const renamed = fields.map((field) =>
            field.key === "multiline_field" ? { ...field, name: "content" } : field,
        ) as FieldConfig<Row, Row>[];
        const { container, run, errors, createRowAction } = setup(renamed);

        expect(await run()).toBe(true);
        expect(errors().join("")).not.toContain("is required");
        expect(createRowAction.mock.calls[0]![0]).toMatchObject({
            multiline_field: "Required multiline content",
        });
        expect(container.querySelector("[name=content]")).toBeNull();
    });
});
