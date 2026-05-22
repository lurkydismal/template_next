import { describe, expect, it, vi } from 'vitest';

import { rowHasChanges, rowHasId } from '../src/components/TableDataGrid/RowDialog/Content/changeDetection';
import { getFieldRules } from '../src/components/TableDataGrid/RowDialog/Content/validation';
import type { FieldConfig } from '../src/components/TableDataGrid/RowDialog/types';
import type { UseFormReturn } from 'react-hook-form';

type Row = {
  id: string | null;
  amount?: number;
  uuid?: string;
  hex?: string;
  inet?: string;
  custom?: string;
};

type Field = FieldConfig<Row, Row>;

/**
 * Creates a tiny form stub that matches only getValues() required by getFieldRules.
 */
function createFormStub(allValues: Record<string, unknown>) {
  return {
    getValues: () => allValues,
  } as UseFormReturn<Record<string, unknown>>;
}

describe('row change detection', () => {
  it('rowHasChanges ignores readOnly unless interconnected and detects trimmed differences', () => {
    const fields: Field[] = [
      { key: 'custom', label: 'Custom', readOnly: true },
      { key: 'uuid', label: 'UUID' },
    ];

    expect(
      rowHasChanges(
        { id: '1', custom: 'A', uuid: ' value ' },
        { custom: 'B', uuid: 'value' },
        fields,
      ),
    ).toBe(false);

    expect(
      rowHasChanges(
        { id: '1', custom: 'A', uuid: 'x' },
        { custom: 'A', uuid: 'y' },
        fields,
      ),
    ).toBe(true);
  });

  it('rowHasChanges uses custom isChanged function', () => {
    const fields: Field[] = [
      {
        key: 'amount',
        label: 'Amount',
        isChanged: (oldValue, newValue) => Number(oldValue) !== Number(newValue),
      },
    ];

    expect(rowHasChanges({ id: '1', amount: 1 }, { amount: '1' }, fields)).toBe(false);
    expect(rowHasChanges({ id: '1', amount: 1 }, { amount: 2 }, fields)).toBe(true);
  });

  it('rowHasId validates null/non-null id values', () => {
    expect(rowHasId({ id: null }, 'id')).toBe(false);
    expect(rowHasId({ id: 'abc' }, 'id')).toBe(true);
  });
});

describe('getFieldRules validation', () => {
  it('returns empty rules for readOnly fields', () => {
    const rules = getFieldRules(
      { key: 'uuid', label: 'UUID', readOnly: true },
      [],
      createFormStub({}),
      { id: '1' },
      {},
    );
    expect(rules).toEqual({});
  });

  it('validates built-in number/uuid/hex/inet types and required-group constraints', async () => {
    const baseRow = { id: '1' } as Row;
    const fields = [
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'uuid', label: 'UUID', type: 'uuid' },
      { key: 'hex', label: 'Hex', type: 'hex' },
      { key: 'inet', label: 'INET', type: 'inet', inetAllowPort: true },
      { key: 'custom', label: 'Custom', requiredGroup: 'g1', requiredGroupMin: 1 },
      { key: 'amount', label: 'Amount 2', requiredGroup: 'g1', requiredGroupMin: 1 },
    ] as Field[];

    const form = createFormStub({ custom: '', amount: '' });

    const numberRules = getFieldRules(fields[0], fields, form, baseRow, {});
    await expect(numberRules.validate?.('2')).resolves.toBe(true);
    await expect(numberRules.validate?.('abc')).resolves.toBe('Enter a valid number');

    const uuidRules = getFieldRules(fields[1], fields, form, baseRow, {});
    await expect(uuidRules.validate?.('not-uuid')).resolves.toBe('Enter a valid UUID value');

    const hexRules = getFieldRules(fields[2], fields, form, baseRow, {});
    await expect(hexRules.validate?.('0x1af')).resolves.toBe(true);

    const inetRules = getFieldRules(fields[3], fields, form, baseRow, {});
    await expect(inetRules.validate?.('127.0.0.1:3000')).resolves.toBe(true);
    await expect(inetRules.validate?.('[2001:db8::1]:443')).resolves.toBe(true);
    await expect(inetRules.validate?.('999.0.0.1')).resolves.toContain('Enter a valid IPv4/IPv6 value');

    const groupRules = getFieldRules(fields[4], fields, form, baseRow, {});
    await expect(groupRules.validate?.('')).resolves.toContain('Enter at least 1 of:');
  });

  it('validates table lookup and custom validate hooks', async () => {
    const tableLookup = vi.fn(async (value: unknown) => value === 'ok');
    const customValidate = vi.fn(async (value: unknown) => (value === 'x' ? 'bad value' : true));

    const field: Field = {
      key: 'custom',
      label: 'Custom',
      type: 'tableLookup',
      tableLookup,
      tableLookupErrorMessage: 'lookup failed',
      validate: customValidate,
      required: true,
    };

    const form = createFormStub({ custom: 'ok' });
    const rules = getFieldRules(field, [field], form, { id: '1' }, {});

    expect(rules.required).toBe('Custom is required');
    await expect(rules.validate?.('ok')).resolves.toBe(true);
    await expect(rules.validate?.('bad')).resolves.toBe('lookup failed');
    await expect(rules.validate?.('x')).resolves.toBe('lookup failed');
    expect(tableLookup).toHaveBeenCalled();
  });
});
