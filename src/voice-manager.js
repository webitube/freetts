/**
 * VoiceManager handles loading and managing TTS voices for both
 * Web Speech API and Kokoro TTS engines.
 */

/**
 * Load Web Speech voices and populate voice selector
 * @param {Object} elements - DOM elements object
 * @param {SpeechSynthesis} synth - SpeechSynthesis instance
 * @returns {Array} Loaded voices array
 */
export function loadWebSpeechVoices(elements, synth) {
    const voices = synth.getVoices();
    elements.voiceSelect.innerHTML = voices
        .map((v, i) => `<option value="${i}">${v.name} (${v.lang})</option>`)
        .join('');
    return voices;
}

/**
 * Load Kokoro voices and populate voice selector
 * @param {Object} elements - DOM elements object
 * @param {Object} kokoroVoices - Kokoro voices object
 */
export function loadKokoroVoices(elements, kokoroVoices) {
    elements.voiceSelect.innerHTML = Object.entries(kokoroVoices)
        .map(([key, v]) => {
            const locale = v.language === 'en-us' ? 'American' : 'British';
            return `<option value="${key}">${v.name} (${locale} ${v.gender})</option>`;
        })
        .join('');
}

/**
 * Update pitch warning UI
 * @param {HTMLElement} pitchSlider - Pitch slider element
 */
export function updatePitchWarning(pitchSlider) {
    pitchSlider.disabled = false;
}
