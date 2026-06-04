/**
 * Debug Logging Module
 *
 * Provides structured debug logging utilities with optional performance timers.
 * All logging is conditional on global debugMode flag from AppStore.
 *
 * Supports:
 * - Formatted console output with visual markers (>>>, <<<, ==)
 * - Optional performance timers via console.time/timeEnd
 * - Log level variants: debugLog, debugWarn, debugError (+ End variants)
 * - Array logging with header/footer
 * - Character repetition utilities for formatting
 */

import { getDebugMode } from './global-switches';

/**
 * Creates a string of a specified length filled with a given character.
 * Used to create visual separators in debug output.
 *
 * @param length - The length of the string.
 * @param char - The character to repeat.
 * @returns The resulting string.
 */
export function repeatChar(length: number, char: string): string {
    if (typeof length !== 'number' || !Number.isInteger(length) || length < 0) {
        throw new RangeError('length must be a non-negative integer');
    }
    return String(char).repeat(length);
}

/**
 * Log an array of messages with formatted header and footer.
 * Optionally measures execution time.
 *
 * @param title - The title of the log array.
 * @param msgs - An array of messages to log.
 * @param timerName - Optional name for the performance timer.
 */
export function debugLogArray(title: string, msgs: string[], timerName?: string): void {
    const titleLen = title.length;
    const header = repeatChar(titleLen + 8, '>');
    console.log(header);
    console.log(`>>> ${title} >>>`);

    if (timerName != undefined) {
        console.time(`=== ${timerName} ===`);
    }
    for (const curr_msg of msgs) {
        debugLog(curr_msg);
    }
    if (timerName != undefined) {
        console.timeEnd(`=== ${timerName} ===`);
    }

    const footer = repeatChar(titleLen + 8, '<');
    console.log(footer);
}

/**
 * Log a debug message with optional timer start.
 * Formatted with visual markers (>>>, <<<).
 * Only outputs if debugMode is enabled.
 *
 * @param msg - The message to log.
 * @param timerName - Optional name for the performance timer.
 */
export function debugLog(msg: string, timerName = ''): void {
    if (getDebugMode()) {
        if (timerName !== '') {
            const msgLen = msg.length;
            const middle = repeatChar(msgLen + 8, '>');
            console.log(middle);
            console.log(`>>> ${msg} >>>`);
            console.time(`=== ${timerName} ===`);
        } else {
            console.log(msg);
        }
    }
}

/**
 * Ends a debug log session, optionally ending a timer.
 *
 * @param msg - The message to log.
 * @param timerName - Optional name for the performance timer to end.
 */
export function debugLogEnd(msg: string, timerName = ''): void {
    if (getDebugMode()) {
        if (timerName !== '') {
            console.timeEnd(`=== ${timerName} ===`);
            console.log(`<<< ${msg} <<<`);
            const msgLen = msg.length;
            const middle = repeatChar(msgLen + 8, '<');
            console.log(middle);
        } else {
            console.log(msg);
        }
    }
}

/**
 * Log a warning message with optional timer start.
 * Only outputs if debugMode is enabled.
 *
 * @param msg - The warning message to log.
 * @param timerName - Optional name for the performance timer.
 */
export function debugWarn(msg: string, timerName = ''): void {
    if (getDebugMode()) {
        console.warn(msg);
        if (timerName !== '') {
            console.time(timerName);
        }
    }
}

/**
 * Log a warning message and optionally end a timer.
 * Only outputs if debugMode is enabled.
 */
export function debugWarnEnd(msg: string, timerName = ''): void {
    if (getDebugMode()) {
        if (timerName !== '') {
            console.timeEnd(timerName);
        }
        console.warn(msg);
    }
}

/**
 * Log an error message with optional timer start.
 * Only outputs if debugMode is enabled.
 */
export function debugError(msg: string, timerName = ''): void {
    if (getDebugMode()) {
        console.error(msg);
        if (timerName !== '') {
            console.time(timerName);
        }
    }
}

/**
 * Log an error message and optionally end a timer.
 * Only outputs if debugMode is enabled.
 */
export function debugErrorEnd(msg: string, timerName = ''): void {
    if (getDebugMode()) {
        if (timerName !== '') {
            console.timeEnd(timerName);
        }
        console.error(msg);
    }
}
