/**
 * App Utilities Module.
 *
 * Helper functions for status messages, UI toggling, and engine selection.
 * Reads state from AppStore where applicable.
 *
 * @module app-utils
 */

import { AppStore } from './app-store';

/**
 * Update the status message element with a message and device indicator.
 *
 * @param status - The status HTMLElement to update (may be undefined).
 * @param msg - The status message text.
 * @param device - Optional device string; falls back to `AppStore.activeDevice`.
 */
export function updateStatusMsg(status: HTMLElement | undefined, msg: string, device?: string): void {
    if (status != undefined) {
        const deviceStr = device ? device.toUpperCase() : AppStore.instance.activeDevice.get().toUpperCase();
        status.textContent = `${msg} (${deviceStr})`;
    }
}

/**
 * Reset the status message after a delay by invoking the callback with a ready message.
 *
 * @param statusCallback - Callback that receives the status message string.
 * @param delay - Delay in milliseconds before resetting. Default: `2000`.
 * @param readyMessage - Message to display after the delay. Default: `'Ready.'`.
 */
export function resetStatusAfterDelay(statusCallback: (msg: string) => void, delay = 2000, readyMessage = 'Ready.'): void {
    if (typeof statusCallback === 'function') {
        setTimeout(() => statusCallback(readyMessage), delay);
    }
}

/**
 * Toggle the `hidden` CSS class on an element.
 *
 * @param element - The HTMLElement to toggle (may be null or undefined).
 * @param hidden - Whether the element should be hidden.
 */
export function toggleHidden(element: HTMLElement | null | undefined, hidden: boolean): void {
    if (element) {
        element.classList.toggle('hidden', hidden);
    }
}

/**
 * Capitalize the first character of a string.
 *
 * @param original - The string to capitalize.
 * @returns The string with the first character uppercased.
 */
export function capitalizeMsg(original: string): string {
    return original.charAt(0).toUpperCase() + original.slice(1);
}

/**
 * Get the currently selected TTS engine from the `#engine-select` dropdown.
 *
 * @returns A tuple of `[displayText, value]` for the selected option, or `['Unknown', '']` if not found.
 */
export function getSelectedEngine(): [string, string] {
    const engineSelect = document.getElementById('engine-select') as HTMLSelectElement | null;
    if (engineSelect) {
        return [engineSelect.options[engineSelect.selectedIndex].text, engineSelect.value];
    }
    return ['Unknown', ''];
}

/**
 * Update the `#active-device-msg` element to reflect the selected engine and device.
 *
 * @param activeDevice - Optional device string; falls back to `AppStore.activeDevice`.
 */
export function updateSelectedEngine(activeDevice?: string): void {
    const [selectedEngineText, selectedEngine] = getSelectedEngine();
    const device = activeDevice !== undefined ? activeDevice : AppStore.instance.activeDevice.get();
    if (selectedEngine === 'webspeech' || device === '') {
        const el = document.getElementById('active-device-msg');
        if (el) el.textContent = selectedEngineText;
    } else {
        const el = document.getElementById('active-device-msg');
        if (el) el.textContent = `${selectedEngineText}: ${device.toLocaleUpperCase()}`;
    }
}
