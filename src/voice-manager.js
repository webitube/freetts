/**
 * VoiceManager handles loading and managing TTS voices for both
 * Web Speech API and Kokoro TTS engines.
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
 * Load Web Speech voices and populate voice selector
 * @param {Object} elements - DOM elements object
 * @param {SpeechSynthesis} synth - SpeechSynthesis instance
 * @param {string} [savedVoice] - Previously saved voice name to restore
 * @returns {Array} Loaded voices array
 */
export function loadWebSpeechVoices(elements, synth, savedVoice) {
    const voices = synth.getVoices();
    //debugLogArray(`loadWebSpeechVoices(): Web Speech Voices: ${voices.length} voices`, voices)
    elements.voiceSelect.innerHTML = voices
        .map((v) => `<option value="${v.name}">${v.name} (${v.lang})</option>`)
        .join('');

    // Restore saved voice selection after populating options
    debugLog(`loadWebSpeechVoices(): voices.length=${voices.length}; savedVoice="${savedVoice}"`);
    if (savedVoice !== undefined && savedVoice !== '') {
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
    }
    else
    {
        // No saved voice — default to the first available voice.
        // Then, update the local storage for the currently selected engine.
        if (voices.length > 0) {
            elements.voiceSelect.value = voices[0].name;
            const currentEngine = elements.engineSelect.value;
            saveIfNoSettings(elements);
            setSavedVoice(currentEngine, elements.voiceSelect.value);
        }
    }
    return voices;
}

/**
 * Load Kokoro voices and populate voice selector
 * @param {Object} elements - DOM elements object
 * @param {Object} kokoroVoices - Kokoro voices object
 * @param {string} [savedVoice] - Previously saved voice to restore
 */
export function loadKokoroVoices(elements, kokoroVoices, savedVoice) {
    //debugLog(`loadKokoroVoices():1: savedVoice=${savedVoice}`);
    elements.voiceSelect.innerHTML = Object.entries(kokoroVoices)
        .map(([key, v]) => {
            const locale = v.language === 'en-us' ? 'American' : 'British';
            return `<option value="${key}">${v.name} (${locale} ${v.gender})</option>`;
        })
        .join('');
    // Restore saved voice selection after populating options
    if (savedVoice !== undefined && savedVoice !== '') {
        //debugLog(`loadKokoroVoices():2: savedVoice=${savedVoice}`);
        elements.voiceSelect.value = savedVoice;
        saveTTSSettings(elements);
        setSavedVoice(currentEngine, elements.voiceSelect.value);    }
    else
    {
        // No saved voice — default to the first available voice
        const firstKey = Object.keys(kokoroVoices)[0];
        //debugLog(`loadKokoroVoices():3: savedVoice=${savedVoice}`);
        if (firstKey) {
            elements.voiceSelect.value = firstKey;
            const currentEngine = elements.engineSelect.value;
            //debugLog(`loadKokoroVoices():4: savedVoice=${savedVoice}, currentEngine=${currentEngine}, elements.voiceSelect.value=${elements.voiceSelect.value}`);
            saveTTSSettings(elements);
            setSavedVoice(currentEngine, elements.voiceSelect.value);
        }
    }
    saveTTSSettings(elements);
    setSavedVoice(currentEngine, elements.voiceSelect.value);
    //debugLog(`loadKokoroVoices():5: savedVoice=${savedVoice}, currentEngine=${currentEngine}, elements.voiceSelect.value=${elements.voiceSelect.value}`);
}

/**
 * Update pitch warning UI
 * @param {HTMLElement} pitchSlider - Pitch slider element
 */
export function updatePitchWarning(pitchSlider) {
    pitchSlider.disabled = false;
}
