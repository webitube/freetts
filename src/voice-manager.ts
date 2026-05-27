/**
 * VoiceManager — Voice loading and management for TTS engines
 *
 * Handles voice selection UI population and restoration for both
 * Web Speech API (browser-provided voices) and Kokoro TTS engines.
 * Now backed by AppStore reactive state.
 */

import { AppStore } from './app-store';
import { saveTTSSettings } from './settings-persistence';
import { debugLog } from './debug-log';

interface VoiceInfo {
    name: string;
    lang: string;
}

interface KokoroVoiceInfo {
    name: string;
    language: string;
    gender: string;
}

/**
 * Populate voice selector UI with the given voices array.
 */
function populateVoiceSelect(
    elements: Record<string, unknown>,
    voices: VoiceInfo[],
    savedVoice?: string,
): void {
    const voiceSelect = elements.voiceSelect as HTMLSelectElement;
    if (!voiceSelect) return;

    voiceSelect.innerHTML = voices
        .map((v) => `<option value="${v.name}">${v.name} (${v.lang})</option>`)
        .join('');

    debugLog(`populateVoiceSelect(): 1: voices.length=${voices.length}; savedVoice="${savedVoice}"`);

    if (savedVoice !== undefined && savedVoice !== '') {
        debugLog(`populateVoiceSelect(): 2: voices.length=${voices.length}; savedVoice="${savedVoice}"`);
        let resolvedVoice = savedVoice;
        const indexMatch = savedVoice.match(/^\d+$/);
        if (indexMatch) {
            const idx = parseInt(savedVoice, 10);
            resolvedVoice = voices[idx] ? voices[idx].name : (voices.length > 0 ? voices[0].name : '');
        } else {
            const exists = voices.some(v => v.name === savedVoice);
            resolvedVoice = exists ? savedVoice : (voices.length > 0 ? voices[0].name : '');
        }
        voiceSelect.value = resolvedVoice;
        saveTTSSettings(elements);
    } else {
        debugLog(`populateVoiceSelect(): 3: voices.length=${voices.length}; savedVoice="${savedVoice}"`);
        if (voices.length > 0) {
            voiceSelect.value = voices[0].name;
            saveTTSSettings(elements);
        }
    }
}

/**
 * Load Web Speech voices and populate voice selector.
 */
export function loadWebSpeechVoices(
    elements: Record<string, unknown>,
    synth: SpeechSynthesis,
    savedVoice?: string,
): Promise<VoiceInfo[]> {
    return new Promise((resolve) => {
        const voices = synth.getVoices() as unknown as VoiceInfo[];
        if (voices.length > 0) {
            populateVoiceSelect(elements, voices, savedVoice);
            AppStore.instance.webSpeechVoicesLoaded.set(true);
            resolve(voices);
        } else {
            debugLog(`loadWebSpeechVoices(): voices not yet loaded, waiting for voiceschanged event`);

            const onVoicesChanged = () => {
                synth.removeEventListener('voiceschanged', onVoicesChanged);
                const loadedVoices = synth.getVoices() as unknown as VoiceInfo[];
                debugLog(`loadWebSpeechVoices(): voiceschanged fired, loaded ${loadedVoices.length} voices`);
                populateVoiceSelect(elements, loadedVoices, savedVoice);
                AppStore.instance.webSpeechVoicesLoaded.set(true);
                resolve(loadedVoices);
            };

            synth.addEventListener('voiceschanged', onVoicesChanged);

            setTimeout(() => {
                synth.removeEventListener('voiceschanged', onVoicesChanged);
                const timeoutVoices = synth.getVoices() as unknown as VoiceInfo[];
                debugLog(`loadWebSpeechVoices(): voiceschanged timeout after 5s, loaded ${timeoutVoices.length} voices`);
                populateVoiceSelect(elements, timeoutVoices, savedVoice);
                AppStore.instance.webSpeechVoicesLoaded.set(true);
                resolve(timeoutVoices);
            }, 5000);
        }
    });
}

/**
 * Load Kokoro voices and populate voice selector
 */
export function loadKokoroVoices(
    elements: Record<string, unknown>,
    kokoroVoices: Record<string, KokoroVoiceInfo>,
    savedVoice?: string,
): void {
    const voiceSelect = elements.voiceSelect as HTMLSelectElement;
    if (!voiceSelect) return;

    const currentEngine = AppStore.instance.engine.get();
    debugLog(`loadKokoroVoices():1: savedVoice=${savedVoice}, currentEngine=${currentEngine}`);

    voiceSelect.innerHTML = Object.entries(kokoroVoices)
        .map(([key, v]) => {
            const locale = v.language === 'en-us' ? 'American' : 'British';
            return `<option value="${key}">${v.name} (${locale} ${v.gender})</option>`;
        })
        .join('');

    if (savedVoice !== undefined && savedVoice !== '') {
        debugLog(`loadKokoroVoices():2: savedVoice=${savedVoice}`);
        voiceSelect.value = savedVoice;
    } else {
        const firstKey = Object.keys(kokoroVoices)[0];
        debugLog(`loadKokoroVoices():3: savedVoice=${savedVoice}`);
        if (firstKey) {
            voiceSelect.value = firstKey;
            debugLog(`loadKokoroVoices():4: savedVoice=${savedVoice}, currentEngine=${currentEngine}, elements.voiceSelect.value=${voiceSelect.value}`);
        }
    }

    AppStore.instance.kokoroVoicesLoaded.set(true);
    debugLog(`loadKokoroVoices():5: savedVoice=${savedVoice}, currentEngine=${currentEngine}, elements.voiceSelect.value=${voiceSelect.value}`);
}

/**
 * Update pitch warning UI
 */
export function updatePitchWarning(pitchSlider: HTMLInputElement | null): void {
    if (pitchSlider) {
        pitchSlider.disabled = false;
    }
}
