/**
 * Settings Persistence Module
 *
 * Thin wrapper around AppStore for backward compatibility.
 * All persistence logic now lives in AppStore.saveToLocalStorage() / loadFromLocalStorage().
 */

import { AppStore, EngineEnum } from './app-store';

/**
 * Check if settings exist in localStorage.
 *
 * @returns True if settings exist, false otherwise.
 */
export function hasSettings(): boolean {
    return AppStore.instance.hasSettings();
}

/**
 * Save settings if none exist yet.
 * Syncs from DOM elements (if provided) before saving.
 *
 * @param elements - DOM elements object (retained for backward compat).
 */
export function saveIfNoSettings(elements?: Record<string, unknown>): void {
    if (!hasSettings()) {
        // Sync from DOM elements before saving (backward compat)
        if (elements) {
            const engineSelect = (elements as any).engineSelect as HTMLSelectElement;
            const voiceSelect = (elements as any).voiceSelect as HTMLSelectElement;
            const speedSlider = (elements as any).speedSlider as HTMLInputElement;
            const pitchSlider = (elements as any).pitchSlider as HTMLInputElement;

            if (engineSelect) {
                AppStore.instance.engine.set(engineSelect.value as EngineEnum);
            }
            if (voiceSelect) {
                const currentEngine = AppStore.instance.engine.get();
                AppStore.instance.setSavedVoice(currentEngine, voiceSelect.value);
            }
            if (speedSlider) {
                AppStore.instance.speed.set(parseFloat(speedSlider.value));
            }
            if (pitchSlider) {
                AppStore.instance.pitch.set(parseFloat(pitchSlider.value));
            }
        }
        AppStore.instance.saveToLocalStorage();
    }
}

/**
 * Get the saved voice for a specific engine.
 *
 * @param engine - Engine name ('webspeech' or 'kokoro').
 * @returns The saved voice name.
 */
export function getSavedVoice(engine: string): string {
    return AppStore.instance.getSavedVoice(engine);
}

/**
 * Set the saved voice for a specific engine.
 *
 * @param engine - Engine name ('webspeech' or 'kokoro').
 * @param savedVoice - Voice name to save.
 */
export function setSavedVoice(engine: string, savedVoice: string): void {
    AppStore.instance.setSavedVoice(engine, savedVoice);
}

/**
 * Save TTS settings to localStorage.
 *
 * @param elements - DOM elements object (retained for backward compat).
 * @param saveEngineOnly - If true, only save the engine selection.
 */
export function saveTTSSettings(elements?: Record<string, unknown>, saveEngineOnly = false): void {
    if (elements) {
        const engineSelect = (elements as any).engineSelect as HTMLSelectElement;
        const voiceSelect = (elements as any).voiceSelect as HTMLSelectElement;
        const speedSlider = (elements as any).speedSlider as HTMLInputElement;
        const pitchSlider = (elements as any).pitchSlider as HTMLInputElement;

        if (engineSelect) {
            const engineVal = engineSelect.value as EngineEnum;
            AppStore.instance.engine.set(engineVal);
        }

        if (!saveEngineOnly && voiceSelect) {
            const currentEngine = AppStore.instance.engine.get();
            AppStore.instance.setSavedVoice(currentEngine, voiceSelect.value);
        }

        if (speedSlider) {
            AppStore.instance.speed.set(parseFloat(speedSlider.value));
        }

        if (pitchSlider) {
            AppStore.instance.pitch.set(parseFloat(pitchSlider.value));
        }
    }

    AppStore.instance.saveToLocalStorage();
}

/**
 * Load TTS settings from localStorage and apply to DOM elements.
 * @param elements - DOM elements object
 * @returns Loaded settings object with engine and current voice
 */
export function loadTTSSettings(elements?: Record<string, unknown>): { engine: string; voice: string } {
    AppStore.instance.loadFromLocalStorage();

    if (elements) {
        const engineSelect = (elements as any).engineSelect as HTMLSelectElement;
        const voiceSelect = (elements as any).voiceSelect as HTMLSelectElement;
        const speedSlider = (elements as any).speedSlider as HTMLInputElement;
        const speedVal = (elements as any).speedVal as HTMLElement;
        const pitchSlider = (elements as any).pitchSlider as HTMLInputElement;
        const pitchVal = (elements as any).pitchVal as HTMLElement;

        const currentEngine = AppStore.instance.engine.get();
        const savedVoice = AppStore.instance.getSavedVoice(currentEngine);

        if (engineSelect) engineSelect.value = currentEngine;
        if (voiceSelect) voiceSelect.value = savedVoice;
        if (speedSlider) {
            speedSlider.value = String(AppStore.instance.speed.get());
        }
        if (speedVal) {
            speedVal.textContent = `${parseFloat(String(AppStore.instance.speed.get())).toFixed(1)}×`;
        }
        if (pitchSlider) {
            pitchSlider.value = String(AppStore.instance.pitch.get());
        }
        if (pitchVal) {
            const pitchValNum = parseFloat(String(AppStore.instance.pitch.get()));
            pitchVal.textContent = pitchValNum > 0 ? `+${pitchValNum.toFixed(1)}` : `${pitchValNum.toFixed(1)}`;
        }

        return { engine: currentEngine, voice: savedVoice };
    }

    return {
        engine: AppStore.instance.engine.get(),
        voice: AppStore.instance.getSavedVoice(AppStore.instance.engine.get()),
    };
}

/**
 * Reset TTS settings to defaults.
 * @param elements - DOM elements object
 * @param statusCallback - Callback to update status message
 * @param editorManager - Optional editor manager instance
 */
export function resetTTSSettings(
    elements?: Record<string, unknown>,
    statusCallback?: (msg: string) => void,
    editorManager?: any,
): void {
    AppStore.instance.resetToDefaults();

    if (elements) {
        const engineSelect = (elements as any).engineSelect as HTMLSelectElement;
        const voiceSelect = (elements as any).voiceSelect as HTMLSelectElement;
        const speedSlider = (elements as any).speedSlider as HTMLInputElement;
        const speedVal = (elements as any).speedVal as HTMLElement;
        const pitchSlider = (elements as any).pitchSlider as HTMLInputElement;
        const pitchVal = (elements as any).pitchVal as HTMLElement;

        if (engineSelect) engineSelect.value = 'webspeech';
        if (voiceSelect) voiceSelect.value = '';
        if (speedSlider) speedSlider.value = '1';
        if (speedVal) speedVal.textContent = '1×';
        if (pitchSlider) pitchSlider.value = '0';
        if (pitchVal) pitchVal.textContent = '0';
    }

    if (editorManager && typeof editorManager.switchToSource === 'function') {
        editorManager.switchToSource();
    }

    if (statusCallback) {
        statusCallback('Settings reset.');
    }
}

/**
 * Get the storage key (for testing purposes)
 */
export function getStorageKey(): string {
    return 'freetts-settings';
}
