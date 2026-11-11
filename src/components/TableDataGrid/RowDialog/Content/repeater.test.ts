import { describe, expect, it } from "vitest";

import type { RepeaterFieldConfig, RepeaterSubField } from "../types";

import {
    countFilledItems,
    formatRepeaterSummary,
    normalizeRepeaterItems,
    repeaterValuesEqual,
    resolveRepeaterFields,
    serializeRepeaterValue,
} from "./repeater";

type Repeater = RepeaterFieldConfig<Record<string, unknown>, Record<string, unknown>>;

const contacts: Repeater = {
    key: "contacts",
    label: "Contacts",
    type: "repeater",
    fields: [
        { key: "name", label: "Name", type: "text" },
        { key: "vip", label: "VIP", type: "boolean", variant: "switch" },
        {
            key: "channel",
            label: "Channel",
            type: "radio-group",
            options: ["Email", "Phone"],
            default: "Email",
        },
        {
            key: "notes",
            label: "Notes",
            type: "repeater",
            fields: [{ key: "text", label: "Note", type: "text" }],
        },
    ],
};

describe("repeater values", () => {
    it("treats untouched defaults as blank", () => {
        const items = [{ name: "", vip: false, channel: "Email", notes: [{ text: " " }] }];
        expect(countFilledItems(contacts, items)).toBe(0);
        expect(normalizeRepeaterItems(contacts, items)).toEqual([]);
    });

    it("counts an entry as filled once any sub-field differs from its default", () => {
        expect(countFilledItems(contacts, [{ vip: true }])).toBe(1);
        expect(countFilledItems(contacts, [{ channel: "Phone" }])).toBe(1);
        expect(countFilledItems(contacts, [{ notes: [{ text: "x" }] }])).toBe(1);
    });

    it("fills missing keys and only trims trailing blank entries", () => {
        const result = normalizeRepeaterItems(contacts, [{ name: "A" }, {}, { name: "B" }, {}]);

        expect(result).toEqual([
            { name: "A", vip: false, channel: "Email", notes: [] },
            { name: null, vip: false, channel: "Email", notes: [] },
            { name: "B", vip: false, channel: "Email", notes: [] },
        ]);
    });

    it("serializes only filled entries with keys in config order and nulls for blanks", () => {
        const stored = serializeRepeaterValue(contacts, [
            { notes: [{ text: "n" }, { text: "" }], name: " Ann ", extra: 1 },
            {},
            { name: "  " },
        ]);

        expect(stored).toEqual([
            {
                name: " Ann ",
                vip: false,
                channel: "Email",
                notes: [{ text: "n" }],
            },
        ]);
        expect(Object.keys(stored[0]!)).toEqual(["name", "vip", "channel", "notes"]);
    });

    it("compares by stored form, ignoring blank entries, key order and null vs missing", () => {
        expect(
            repeaterValuesEqual(
                contacts,
                [{ name: "A", vip: false, channel: "Email", notes: [] }],
                [{ notes: [], name: "A" }, {}],
            ),
        ).toBe(true);
        expect(repeaterValuesEqual(contacts, null, [])).toBe(true);
        expect(repeaterValuesEqual(contacts, [{ name: "A" }], [{ name: "B" }])).toBe(false);
    });

    it("summarizes entries for grid cells and exports", () => {
        expect(
            formatRepeaterSummary(contacts, [
                { name: "Ann", vip: true, channel: "Phone" },
                { name: "Bob" },
            ]),
        ).toBe("Ann / VIP / Phone, Bob / Email");
    });

    it("lets a repeater contain itself through a fields thunk", () => {
        const node: RepeaterSubField = {
            key: "children",
            label: "Children",
            type: "repeater",
            fields: () => [{ key: "title", label: "Title", type: "text" }, node],
        };

        const resolved = resolveRepeaterFields(node as Repeater);
        expect(resolved).toBe(resolveRepeaterFields(node as Repeater)); // stable identity
        expect(resolved[1]).toBe(node);

        const tree = serializeRepeaterValue(node as Repeater, [
            { title: "a", children: [{ title: "b", children: [{ title: "c" }] }, {}] },
        ]);
        expect(tree).toEqual([
            { title: "a", children: [{ title: "b", children: [{ title: "c", children: [] }] }] },
        ]);
    });
});
