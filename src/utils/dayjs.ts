/**
 * Day.js instance with UTC and timezone support enabled.
 *
 * - `utc` plugin adds support for parsing and manipulating dates in UTC.
 * - `timezone` plugin enables timezone conversions.
 *
 * This module also exposes a helper function for formatting dates using
 * a shared application-wide date format.
 */

import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import customParseFormat from "dayjs/plugin/customParseFormat";
import timezone from "dayjs/plugin/timezone";
import { dateFormat, dateTimeFormat } from "@/utils/stdvar";
import { validateDate } from "@/utils/validate";

/**
 * Enable UTC handling for Day.js.
 */
dayjs.extend(utc);

/**
 * Enable timezone handling for Day.js.
 */
dayjs.extend(timezone);

// TODO: Comment
dayjs.extend(customParseFormat);

// TODO: Decide
// dayjs.tz.setDefault(dayjs.tz.guess());

/**
 * Format a date-like value using the local timezone and a predefined format.
 * Throws if the value is not a valid date.
 *
 * @param date - A string, Date, or Dayjs instance
 * @returns The formatted date string in local time
 */
export function formatDate(
    date: string | Date | Dayjs,
    needTime: boolean = false,
) {
    const parsed = validateDate(date);

    return parsed.local().format(needTime ? dateTimeFormat : dateFormat);
}

/**
 * Export the configured Day.js instance for reuse across the application.
 */
export default dayjs;
