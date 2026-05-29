/**
 * Global Switches Module
 *
 * Provides global configuration flags and accessors for runtime behavior control.
 * Now backed by AppStore.debugMode reactive value.
 */

let debugMode: boolean = false;

/**
 * Enable or disable debug mode globally
 * @param debug - True to enable debug logging, false to disable
 */
export function setDebugMode(debug: boolean): void {
    debugMode = debug;
}

/**
 * Get the current debug mode status
 * @returns Current debug mode state
 */
export function getDebugMode(): boolean {
    return debugMode;
}
