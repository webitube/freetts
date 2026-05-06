/**
 * SettingsPersistence handles localStorage persistence for TTS settings
 * including engine, voice, speed, and pitch configuration.
 */
const STORAGE_KEY = 'freetts-settings';

import {
    getDebugMode,
    setDebugMode
} from './global-switches.js'

import {
    debugLog,
    debugLogEnd,
    debugWarn,
    debugWarnEnd,
    debugError,
    debugErrorEnd
} from './debug-log.js'

/**
 * Default settings values
 * @type {Object}
 */
const DEFAULT_SETTINGS = {
    engine: 'webspeech',
    voices: {
        webspeech: '',
        kokoro: ''
    },
    speed: 1,
    pitch: 0
};


function hasSettings()
{
    return localStorage.getItem(STORAGE_KEY) != undefined;
}

export function saveIfNoSettings(elements)
{
    debugLog(`hasSettings(): ${hasSettings()}`);
    if (!hasSettings())
    {
        saveTTSSettings(elements);
    }
}

function getSettings()
{
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
}

export function getSavedVoice(engine)
{
    const settings = getSettings();
    if (settings != undefined && settings.voices != undefined && engine != undefined)
    {
        return settings.voices[engine];
    }
    return DEFAULT_SETTINGS.voices[engine];
}

export function setSavedVoice(engine, savedVoice)
{
    const settings = getSettings();
    if (settings != undefined && settings.voices != undefined && engine != undefined && savedVoice != undefined && savedVoice != "")
    {
        settings.voices[engine] = savedVoice;
        return;
    }
    console.warn(`setSavedVoice(): savedVoice=${savedVoice}: can't save because settings is undefined or settings.voices is undefined. Has the localStorage for this app already been saved?`);
}

/**
 * Save TTS settings to localStorage
 * @param {Object} elements - DOM elements object
 */
export function saveTTSSettings(elements, saveEngineOnly = false) {
    const currentEngine = elements.engineSelect.value;
    const savedSettings = getSettings();
    debugLog(`saveTTSSettings():BEGIN: saveEngineOnly=${saveEngineOnly}: settings=${JSON.stringify(savedSettings)}`)
    
    // Load current voices
    const voices = savedSettings.voices || { webspeech: '', kokoro: '' };
        
    if (!saveEngineOnly)
    {
        // Save only the voice for the currently selected engine
        voices[currentEngine] = elements.voiceSelect.value;
    }
    
    const settings = {
        engine: currentEngine,
        voices: voices,
        speed: elements.speedSlider.value,
        pitch: elements.pitchSlider.value,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    debugLog(`saveTTSSettings():END: saveEngineOnly=${saveEngineOnly}: settings=${JSON.stringify(settings)}`)
}

/**
 * Load TTS settings from localStorage
 * @param {Object} elements - DOM elements object
 * @returns {Object} Loaded settings object with engine and current voice
 */
export function loadTTSSettings(elements) {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const settings = JSON.parse(saved);
            debugLog(`loadTTSSettings(): settings=${saved}`);

            const currentEngine = settings.engine || DEFAULT_SETTINGS.engine;
            // Restore engine
            elements.engineSelect.value = currentEngine;
            // Restore voice for the current engine
            const savedVoice = settings.voices?.[currentEngine] || DEFAULT_SETTINGS.voices[currentEngine] || '';
            elements.voiceSelect.value = savedVoice;
            // Restore speed
            elements.speedSlider.value = settings.speed || DEFAULT_SETTINGS.speed;
            elements.speedVal.textContent = `${parseFloat(elements.speedSlider.value).toFixed(1)}×`;
            // Restore pitch
            elements.pitchSlider.value = settings.pitch || DEFAULT_SETTINGS.pitch;
            const pitchVal = parseFloat(elements.pitchSlider.value);
            elements.pitchVal.textContent = pitchVal > 0 ? `+${pitchVal.toFixed(1)}` : `${pitchVal.toFixed(1)}`;
            return { engine: currentEngine, voice: savedVoice };
        }
    } catch (e) {
        console.error('Failed to load TTS settings:', e);
    }
    return { engine: DEFAULT_SETTINGS.engine, voice: '' };
}

/**
 * Reset TTS settings to defaults and reload saved settings
 * @param {Object} elements - DOM elements object
 * @param {Function} statusCallback - Callback to update status message
 */
export function resetTTSSettings(elements, statusCallback, editorManager = null) {
    // Clear all saved settings from localStorage
    localStorage.removeItem(STORAGE_KEY);
    // Reset all controls to defaults
    elements.engineSelect.value = DEFAULT_SETTINGS.engine;
    elements.voiceSelect.value = DEFAULT_SETTINGS.voices[DEFAULT_SETTINGS.engine] || '';
    elements.speedSlider.value = DEFAULT_SETTINGS.speed;
    elements.speedVal.textContent = `${DEFAULT_SETTINGS.speed}×`;
    elements.pitchSlider.value = DEFAULT_SETTINGS.pitch;
    elements.pitchVal.textContent = `${DEFAULT_SETTINGS.pitch}`;
    // Switch back to Reveal Codes (Source) mode
    if (editorManager && typeof editorManager.switchToSource === 'function') {
        editorManager.switchToSource();
    }
    // Save the defaults back to localStorage so they persist
    saveTTSSettings(elements);
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
