
/**
 * Global Switches Module
 * 
 * Provides global configuration flags and accessors for runtime behavior control.
 * Used to enable/disable debug logging across the application.
 */

/**
 * Global debug mode flag. When true, all debugLog/debugWarn/debugError calls output to console.
 * Defaults to false so logging is disabled until explicitly enabled.
 * @type {boolean}
 */
let debugMode = false;

/**
 * Enable or disable debug mode globally
 * @param {boolean} debug - True to enable debug logging, false to disable
 */
export function setDebugMode(debug)
{
    debugMode = debug;
}

/**
 * Get the current debug mode status
 * @returns {boolean} Current debug mode state
 */
export function getDebugMode()
{
    return debugMode;
}

