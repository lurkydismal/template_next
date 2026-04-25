/**
 * Day.js instance with UTC and timezone support enabled.
 *
 * - `utc` plugin adds support for parsing and manipulating dates in UTC.
 * - `timezone` plugin enables timezone conversions.
 * - `customParseFormat` plugin allows parsing dates from custom string formats.
 *
 * This module also exposes a helper function for formatting dates using
 * a shared application-wide date format.
 */

import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import customParseFormat from "dayjs/plugin/customParseFormat";
import timezone from "dayjs/plugin/timezone";
import { dateFormat, dateTimeFormat } from "@/utils/stdvar";
import { dateInputSchema } from "@/utils/validate/schemas";

/**
 * Enable UTC handling for Day.js.
 */
dayjs.extend(utc);

/**
 * Enable timezone handling for Day.js.
 */
dayjs.extend(timezone);

/**
 * Enable parsing of custom date formats.
 * Needed if your app accepts user input in non-standard formats.
 */
dayjs.extend(customParseFormat);

/**
 * Optionally set the default timezone to the user's local timezone.
 * Uncommenting this line will make all dayjs() calls default to local tz.
 * - Pros: simplifies code when most dates should use local tz
 * - Cons: may hide explicit tz conversions, potentially causing bugs
 */
// dayjs.tz.setDefault(dayjs.tz.guess());

/**
 * Format a date-like value using the local timezone and a predefined format.
 * Throws if the value is not a valid date.
 *
 * @param date - A string, Date, or Dayjs instance
 * @param needTime - Whether to include time in the output
 * @returns The formatted date string in local time
 */
export function formatDate(
    date: string | Date | Dayjs,
    needTime: boolean = false,
): string {
    const parsed = dateInputSchema.parse(date);

    return parsed.local().format(needTime ? dateTimeFormat : dateFormat);
}

/**
 * Export the configured Day.js instance for reuse across the application.
 */
export default dayjs;
