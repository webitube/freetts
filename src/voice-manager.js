/**
 * VoiceManager handles loading and managing TTS voices for both
 * Web Speech API and Kokoro TTS engines.
 */

/**
 * Load Web Speech voices and populate voice selector
 * @param {Object} elements - DOM elements object
 * @param {SpeechSynthesis} synth - SpeechSynthesis instance
 * @param {string} [savedVoice] - Previously saved voice name to restore
 * @returns {Array} Loaded voices array
 */
export function loadWebSpeechVoices(elements, synth, savedVoice) {
    const voices = synth.getVoices();
    elements.voiceSelect.innerHTML = voices
        .map((v) => `<option value="${v.name}">${v.name} (${v.lang})</option>`)
        .join('');
    // Restore saved voice selection after populating options
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
    return voices;
}

/**
 * Load Kokoro voices and populate voice selector
 * @param {Object} elements - DOM elements object
 * @param {Object} kokoroVoices - Kokoro voices object
 * @param {string} [savedVoice] - Previously saved voice to restore
 */
export function loadKokoroVoices(elements, kokoroVoices, savedVoice) {
    //console.log(`loadKokoroVoices():1: savedVoice=${savedVoice}`);
    elements.voiceSelect.innerHTML = Object.entries(kokoroVoices)
        .map(([key, v]) => {
            const locale = v.language === 'en-us' ? 'American' : 'British';
            return `<option value="${key}">${v.name} (${locale} ${v.gender})</option>`;
        })
        .join('');
    // Restore saved voice selection after populating options
    if (savedVoice !== undefined && savedVoice !== '') {
        //console.log(`loadKokoroVoices():2: savedVoice=${savedVoice}`);
        elements.voiceSelect.value = savedVoice;
    }
    //console.log(`loadKokoroVoices():3: savedVoice=${savedVoice}`);
}

/**
 * Update pitch warning UI
 * @param {HTMLElement} pitchSlider - Pitch slider element
 */
export function updatePitchWarning(pitchSlider) {
    pitchSlider.disabled = false;
}
