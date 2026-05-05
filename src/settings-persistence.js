/**
 * SettingsPersistence handles localStorage persistence for TTS settings
 * including engine, voice, speed, and pitch configuration.
 */
const STORAGE_KEY = 'freetts-settings';

/**
 * Default settings values
 * @type {Object}
 */
const DEFAULT_SETTINGS = {
    engine: 'webspeech',
    voice: '',
    speed: 1,
    pitch: 0
};

/**
 * Save TTS settings to localStorage
 * @param {Object} elements - DOM elements object
 */
export function saveTTSSettings(elements) {
    const settings = {
        engine: elements.engineSelect.value,
        voice: elements.voiceSelect.value,
        speed: elements.speedSlider.value,
        pitch: elements.pitchSlider.value,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

/**
 * Load TTS settings from localStorage
 * @param {Object} elements - DOM elements object
 * @returns {boolean} Whether settings were loaded successfully
 */
export function loadTTSSettings(elements) {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const settings = JSON.parse(saved);
            // Restore engine
            elements.engineSelect.value = settings.engine || DEFAULT_SETTINGS.engine;
            // Restore voice (only if Web Speech is selected)
            if (settings.engine === 'webspeech' && settings.voice) {
                elements.voiceSelect.value = settings.voice;
            }
            // Restore speed
            elements.speedSlider.value = settings.speed || DEFAULT_SETTINGS.speed;
            elements.speedVal.textContent = `${parseFloat(elements.speedSlider.value).toFixed(1)}×`;
            // Restore pitch
            elements.pitchSlider.value = settings.pitch || DEFAULT_SETTINGS.pitch;
            const pitchVal = parseInt(elements.pitchSlider.value);
            elements.pitchVal.textContent = pitchVal > 0 ? `+${pitchVal}` : `${pitchVal}`;
            return true;
        }
    } catch (e) {
        console.error('Failed to load TTS settings:', e);
    }
    return false;
}

/**
 * Reset TTS settings to defaults and reload saved settings
 * @param {Object} elements - DOM elements object
 * @param {Function} statusCallback - Callback to update status message
 */
export function resetTTSSettings(elements, statusCallback) {
    // Reset all controls to defaults
    elements.engineSelect.value = DEFAULT_SETTINGS.engine;
    elements.voiceSelect.value = DEFAULT_SETTINGS.voice;
    elements.speedSlider.value = DEFAULT_SETTINGS.speed;
    elements.speedVal.textContent = `${DEFAULT_SETTINGS.speed}×`;
    elements.pitchSlider.value = DEFAULT_SETTINGS.pitch;
    elements.pitchVal.textContent = `${DEFAULT_SETTINGS.pitch}`;
    // Reload saved settings (keeps user preferences)
    loadTTSSettings(elements);
    statusCallback('Settings reset.');
    setTimeout(() => statusCallback('Ready.'), 2000);
}

/**
 * Get the storage key (for testing purposes)
 * @returns {string}
 */
export function getStorageKey() {
    return STORAGE_KEY;
}
