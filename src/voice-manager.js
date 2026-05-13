/**
 * VoiceManager — Voice loading and management for TTS engines
 * 
 * Handles voice selection UI population and restoration for both
 * Web Speech API (browser-provided voices) and Kokoro TTS engines.
 * Includes backward compatibility for old voice index-based format.
 * 
 * Key features:
 * - Web Speech voice loading with voiceschanged event handling
 * - Async voice resolution with timeout fallback
 * - Voice selection persistence and restoration
 * - Kokoro voice synchronization from worker
 * - Backward compatibility: old index format → new name format
 */

import {
    hasSettings,
    saveIfNoSettings, 
    saveTTSSettings, 
    setSavedVoice
} from "./settings-persistence";

import {
    getDebugMode,
    setDebugMode,
} from './global-switches.js'

import {
    debugLog,
    debugLogEnd,
    debugWarn,
    debugWarnEnd,
    debugError,
    debugErrorEnd,
    debugLogArray,
} from './debug-log.js'


/**
 * Populate voice selector UI with the given voices array.
 * Restores previously saved voice selection if available.
 * Handles backward compatibility for old voice index format.
 * 
 * @param {Object} elements - DOM elements object with voiceSelect dropdown
 * @param {Array} voices - Array of voice objects with name and lang properties
 * @param {string} [savedVoice] - Previously saved voice name to restore
 */
function populateVoiceSelect(elements, voices, savedVoice) {
    //debugLogArray(`populateVoiceSelect(): Web Speech Voices: ${voices.length} voices`, voices)
    elements.voiceSelect.innerHTML = voices
        .map((v) => `<option value="${v.name}">${v.name} (${v.lang})</option>`)
        .join('');

    // Restore saved voice selection after populating options
    debugLog(`populateVoiceSelect(): 1: voices.length=${voices.length}; savedVoice="${savedVoice}"`);
    if (savedVoice !== undefined && savedVoice !== '') {
        debugLog(`populateVoiceSelect(): 2: voices.length=${voices.length}; savedVoice="${savedVoice}"`);
        // Backward compatibility: if savedVoice looks like an old index, convert it
        let resolvedVoice = savedVoice;
        const indexMatch = savedVoice.match(/^\d+$/);
        if (indexMatch) {
            const idx = parseInt(savedVoice, 10);
            resolvedVoice = (voices[idx] ? voices[idx].name : (voices.length > 0 ? voices[0].name : ''));
        } else {
            // Name lookup: check if the saved name still exists
            const exists = voices.some(v => v.name === savedVoice);
            resolvedVoice = exists ? savedVoice : (voices.length > 0 ? voices[0].name : '');
        }
        elements.voiceSelect.value = resolvedVoice;
        saveTTSSettings(elements);
    }
    else
    {
        // No saved voice — default to the first available voice.
        // Then, update the local storage for the currently selected engine.
        debugLog(`populateVoiceSelect(): 3: voices.length=${voices.length}; savedVoice="${savedVoice}"`);
        if (voices.length > 0) {
            elements.voiceSelect.value = voices[0].name;
            const currentEngine = elements.engineSelect.value;
            saveTTSSettings(elements);
        }
    }
}

/**
 * Load Web Speech voices and populate voice selector.
 * Waits for voiceschanged event if voices are not yet available.
 * @param {Object} elements - DOM elements object
 * @param {SpeechSynthesis} synth - SpeechSynthesis instance
 * @param {string} [savedVoice] - Previously saved voice name to restore
 * @returns {Promise<Array>} Promise resolving to the loaded voices array
 */
export function loadWebSpeechVoices(elements, synth, savedVoice) {
    return new Promise((resolve) => {
        const voices = synth.getVoices();
        if (voices.length > 0) {
            // Voices already loaded — populate immediately
            populateVoiceSelect(elements, voices, savedVoice);
            resolve(voices);
        } else {
            // Voices not yet loaded — wait for the voiceschanged event
            debugLog(`loadWebSpeechVoices(): voices not yet loaded, waiting for voiceschanged event`);
            
            const onVoicesChanged = () => {
                synth.removeEventListener('voiceschanged', onVoicesChanged);
                const loadedVoices = synth.getVoices();
                debugLog(`loadWebSpeechVoices(): voiceschanged fired, loaded ${loadedVoices.length} voices`);
                populateVoiceSelect(elements, loadedVoices, savedVoice);
                resolve(loadedVoices);
            };
            
            synth.addEventListener('voiceschanged', onVoicesChanged);
            
            // Safety timeout: if voices don't arrive within 5 seconds, populate with whatever is available
            setTimeout(() => {
                synth.removeEventListener('voiceschanged', onVoicesChanged);
                const timeoutVoices = synth.getVoices();
                debugLog(`loadWebSpeechVoices(): voiceschanged timeout after 5s, loaded ${timeoutVoices.length} voices`);
                populateVoiceSelect(elements, timeoutVoices, savedVoice);
                resolve(timeoutVoices);
            }, 5000);
        }
    });
}

/**
 * Load Kokoro voices and populate voice selector
 * @param {Object} elements - DOM elements object
 * @param {Object} kokoroVoices - Kokoro voices object
 * @param {string} [savedVoice] - Previously saved voice to restore
 */
export function loadKokoroVoices(elements, kokoroVoices, savedVoice) {
    const currentEngine = elements.engineSelect.value;
    debugLog(`loadKokoroVoices():1: savedVoice=${savedVoice}, currentEngine=${currentEngine}`);
    elements.voiceSelect.innerHTML = Object.entries(kokoroVoices)
        .map(([key, v]) => {
            const locale = v.language === 'en-us' ? 'American' : 'British';
            return `<option value="${key}">${v.name} (${locale} ${v.gender})</option>`;
        })
        .join('');

    // Restore saved voice selection after populating options
    if (savedVoice !== undefined && savedVoice !== '') {
        debugLog(`loadKokoroVoices():2: savedVoice=${savedVoice}`);
        elements.voiceSelect.value = savedVoice;
    }
    else
    {
        // No saved voice — default to the first available voice
        const firstKey = Object.keys(kokoroVoices)[0];
        debugLog(`loadKokoroVoices():3: savedVoice=${savedVoice}`);
        if (firstKey) {
            elements.voiceSelect.value = firstKey;
            debugLog(`loadKokoroVoices():4: savedVoice=${savedVoice}, currentEngine=${currentEngine}, elements.voiceSelect.value=${elements.voiceSelect.value}`);
        }
    }

    debugLog(`loadKokoroVoices():5: savedVoice=${savedVoice}, currentEngine=${currentEngine}, elements.voiceSelect.value=${elements.voiceSelect.value}`);
}

/**
 * Update pitch warning UI
 * @param {HTMLElement} pitchSlider - Pitch slider element
 */
export function updatePitchWarning(pitchSlider) {
    pitchSlider.disabled = false;
}
