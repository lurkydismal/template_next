import { describe, expect, it, vi } from 'vitest';

import {
  delay,
  extractFromFormData,
  getEnv,
  isBlob,
  isRecord,
  normalizeArrayOrValue,
  paginate,
  parseBool,
  toCamelCase,
  toPascalCase,
} from '../src/utils/stdfunc';

describe('stdfunc utilities', () => {
  it('getEnv returns set env var and default fallback', () => {
    process.env.TEST_EXPLICIT = 'present';
    expect(getEnv('TEST_EXPLICIT')).toBe('present');
    expect(getEnv('MISSING_WITH_DEFAULT', 'fallback')).toBe('fallback');
  });

  it('getEnv throws when missing and no default', () => {
    delete process.env.MISSING_NO_DEFAULT;
    expect(() => getEnv('MISSING_NO_DEFAULT')).toThrowError(
      'Missing environment variable: MISSING_NO_DEFAULT',
    );
  });

  it('parseBool handles accepted and rejected values', () => {
    expect(parseBool('true')).toBe(true);
    expect(parseBool('1')).toBe(true);
    expect(parseBool('yes')).toBe(true);
    expect(parseBool('TRUE')).toBe(false);
    expect(parseBool('false')).toBe(false);
  });

  it('string case conversion helpers normalize values', () => {
    expect(toCamelCase('  hello-world_test  ')).toBe('helloWorldTest');
    expect(toPascalCase('  hello-world_test  ')).toBe('HelloWorldTest');
    expect(toPascalCase('')).toBe('');
  });

  it('isRecord matches plain objects and rejects arrays/null', () => {
    expect(isRecord({ a: 1 })).toBe(true);
    expect(isRecord(Object.create(null))).toBe(true);
    expect(isRecord([])).toBe(false);
    expect(isRecord(null)).toBe(false);
  });

  it('isBlob detects Blob instances', () => {
    expect(isBlob(new Blob(['x']))).toBe(true);
    expect(isBlob('x')).toBe(false);
  });

  it('extractFromFormData handles FormData, Record, and passthrough values', () => {
    const fd = new FormData();
    fd.set('email', 'a@b.com');
    expect(extractFromFormData(fd, 'email')).toBe('a@b.com');
    expect(extractFromFormData(fd, 'missing')).toBeUndefined();

    expect(extractFromFormData({ x: 12 }, 'x')).toBe(12);
    expect(extractFromFormData({ x: 12 }, '')).toBeUndefined();

    expect(extractFromFormData('raw', 'any')).toBe('raw');
  });

  it('delay validates bounds and caps delay to max timeout', async () => {
    expect(() => delay(-1)).toThrowError('Invalid delay value: -1');

    vi.useFakeTimers();
    const spy = vi.spyOn(globalThis, 'setTimeout');
    const p = delay(70_000);
    expect(spy).toHaveBeenCalledWith(expect.any(Function), 60_000);
    await vi.runAllTimersAsync();
    await p;
    spy.mockRestore();
    vi.useRealTimers();
  });

  it('paginate and normalizeArrayOrValue behave as expected', () => {
    expect(paginate([1, 2, 3, 4, 5], 2, 2)).toEqual([3, 4]);
    expect(normalizeArrayOrValue([9, 8, 7])).toBe(9);
    expect(normalizeArrayOrValue(9)).toBe(9);
  });
});
