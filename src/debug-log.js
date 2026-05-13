/**
 * Debug Logging Module
 * 
 * Provides structured debug logging utilities with optional performance timers.
 * All logging is conditional on global debugMode flag from global-switches.js.
 * 
 * Supports:
 * - Formatted console output with visual markers (>>>, <<<, ==)
 * - Optional performance timers via console.time/timeEnd
 * - Log level variants: debugLog, debugWarn, debugError (+ End variants)
 * - Array logging with header/footer
 * - Character repetition utilities for formatting
 */

import {
    getDebugMode,
    setDebugMode
} from './global-switches.js'


/**
 * Creates a string of a specified length filled with a given character.
 * Used to create visual separators in debug output.
 * 
 * @param {number} length - Desired length (non-negative integer)
 * @param {string} char   - Character to repeat
 * @returns {string} Repeated character string
 * @throws {RangeError} If length is negative or not an integer
 */
export function repeatChar(length, char) {
  if (typeof length !== 'number' || !Number.isInteger(length) || length < 0) {
    throw new RangeError('length must be a non-negative integer');
  }
  return String(char).repeat(length);
}

/**
 * Log an array of messages with formatted header and footer.
 * Optionally measures execution time.
 * 
 * @param {string} title - Header title for the log section
 * @param {Array} msgs - Array of messages to log
 * @param {string} [timerName] - Optional timer name for console.time tracking
 */
export function debugLogArray(title, msgs, timerName)
{
    const titleLen = title.length;
    const header = repeatChar(titleLen + 8, '>');
    console.log(header);
    console.log(`>>> ${title} >>>`);

    if (timerName != undefined)
    {
        console.time(`=== ${timerName} ===`);
    }
    for(const curr_msg of msgs)
    {
        debugLog(curr_msg);
    }
    if (timerName != undefined)
    {
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
 * @param {string} msg - Message to log
 * @param {string} [timerName] - Optional timer name to start with console.time
 */
export function debugLog(msg, timerName = "")
{
    if (getDebugMode())
    {
        if (timerName != "")
        {
            const msgLen = msg.length;
            const middle = repeatChar(msgLen + 8, '>');
            console.log(middle);
            console.log(`>>> ${msg} >>>`);
            console.time(`=== ${timerName} ===`);
        }
        else
        {
            console.log(msg);
        }
    }
}

export function debugLogEnd(msg, timerName = "")
{
    if (getDebugMode())
    {
        if (timerName != "")
        {
            console.timeEnd(`=== ${timerName} ===`);
            console.log(`<<< ${msg} <<<`);
            const msgLen = msg.length;
            const middle = repeatChar(msgLen + 8, '<');
            console.log(middle);        }
        else
        {
            console.log(msg);
        }
    }
}

/**
 * Log a warning message with optional timer start.
 * Only outputs if debugMode is enabled.
 * 
 * @param {string} msg - Warning message to log
 * @param {string} [timerName] - Optional timer name to start with console.time
 */
export function debugWarn(msg, timerName = "")
{
    if (getDebugMode())
    {
        console.warn(msg);
        if (timerName != "")
        {
            console.time(timerName);
        }
    }
}

/**
 * Log a warning message and optionally end a timer.
 * Only outputs if debugMode is enabled.
 * 
 * @param {string} msg - Warning message to log
 * @param {string} [timerName] - Optional timer name to end with console.timeEnd
 */
export function debugWarnEnd(msg, timerName = "")
{
    if (getDebugMode())
    {
        if (timerName != "")
        {
            console.timeEnd(timerName);
        }
        console.warn(msg);
    }
}

/**
 * Log an error message with optional timer start.
 * Only outputs if debugMode is enabled.
 * 
 * @param {string} msg - Error message to log
 * @param {string} [timerName] - Optional timer name to start with console.time
 */
export function debugError(msg, timerName = "")
{
    if (getDebugMode())
    {
        console.error(msg);
        if (timerName != "")
        {
            console.time(timerName);
        }
    }
}

/**
 * Log an error message and optionally end a timer.
 * Only outputs if debugMode is enabled.
 * 
 * @param {string} msg - Error message to log
 * @param {string} [timerName] - Optional timer name to end with console.timeEnd
 */
export function debugErrorEnd(msg, timerName = "")
{
    if (getDebugMode())
    {
        if (timerName != "")
        {
            console.timeEnd(timerName);
        }
        console.error(msg);
    }
}
