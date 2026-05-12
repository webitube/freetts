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
    debugErrorEnd,
    debugLogArray
} from './debug-log.js'


import { EditorManager } from './editor-manager.js';
import { TTSController } from './tts-controller.js';
import { KokoroPlayer } from './kokoro-player.js';
import { highlightVisualWord, getVisualCursorInfo } from './highlighting-utils.js';
import { 
    saveTTSSettings, 
    loadTTSSettings, 
    resetTTSSettings,
    getSavedVoice,
    saveIfNoSettings,
    hasSettings
} from './settings-persistence.js';
import { 
    initThemeToggle, 
    initHelpModal, 
    initClipboardAndDownload,
    setUIState 
} from './ui-manager.js';
import { 
    loadWebSpeechVoices, 
    loadKokoroVoices, 
    updatePitchWarning
} from './voice-manager.js';


setDebugMode(true);
debugLog(`app.js: BEGIN...`);

// Wait for DOM to be fully loaded before accessing elements
document.addEventListener('DOMContentLoaded', async () => {

    // --- INITIAL DATA ---
// Load default text from public/DefaultText.md
const defaultTextResponse = await fetch('DefaultText.md');
const initialValue = await defaultTextResponse.text();

// --- BROWSER DETECTION ---
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);

// --- DOM ELEMENTS ---
const elements = {
    source: document.getElementById('source-editor'),
    visual: document.getElementById('app'),
    container: document.getElementById('editor-container'),
    btnSource: document.getElementById('view-source'),
    btnVisual: document.getElementById('view-visual'),
    btnTts: document.getElementById('tts-toggle'),
    engineSelect: document.getElementById('engine-select'),
    voiceSelect: document.getElementById('voice-select'),
    speedSlider: document.getElementById('tts-speed'),
    speedVal: document.getElementById('speed-val'),
    pitchSlider: document.getElementById('tts-pitch'),
    pitchVal: document.getElementById('pitch-val'),
    status: document.getElementById('status-msg'),
    ttsStatus: document.getElementById('tts-status'),
    playIcon: document.getElementById('play-icon'),
    stopIcon: document.getElementById('stop-icon'),
    helpToggle: document.getElementById('help-toggle'),
    helpModal: document.getElementById('help-modal'),
    helpCloseBtn: document.getElementById('help-close-btn'),
    helpCloseFooter: document.getElementById('help-close-footer'),
    themeToggle: document.getElementById('theme-toggle'),
    resetSettings: document.getElementById('reset-settings'),
};

// --- INITIALIZE MODULES ---
const editorManager = new EditorManager(elements, initialValue);
elements.source.value = initialValue;


// If there are no local storage settings, then create one.
saveIfNoSettings(elements);

// Initialize KokoroPlayer
const kokoroPlayer = new KokoroPlayer('kokoro-chunk-list', (msg) => {
    if (elements.ttsStatus) elements.ttsStatus.textContent = msg;
    // Show download button when Kokoro TTS is active and has merged audio
    const dlBtn = document.getElementById('download-audio');
    if (dlBtn) {
        dlBtn.classList.toggle('hidden', ttsController.getActiveEngine() !== 'kokoro' || !kokoroPlayer.mergedBlob);
    }
}, (active) => {
    // Sync isSpeaking state with the UI play/stop button
    ttsController.setIsSpeaking(active);
    elements.playIcon.classList.toggle('hidden', active);
    elements.stopIcon.classList.toggle('hidden', !active);
    elements.btnTts.classList.toggle('text-red-600', active);
    elements.btnTts.classList.toggle('text-blue-600', !active);
});

// Initialize TTS Controller
const ttsController = new TTSController(
    elements,
    editorManager,
    kokoroPlayer,
    highlightVisualWord,
    getVisualCursorInfo,
    [], // voices will be populated by loadWebSpeechVoices
    isSafari
);

// --- UI INITIALIZATION ---
initThemeToggle(elements.themeToggle);
initHelpModal(elements);
initClipboardAndDownload(elements, (msg) => {
    if (elements.status) elements.status.textContent = msg;
});

// --- SLIDER DISPLAY ---
elements.speedSlider.oninput = () => {
    elements.speedVal.textContent = `${parseFloat(elements.speedSlider.value).toFixed(1)}×`;
    saveTTSSettings(elements);
};
elements.pitchSlider.oninput = () => {
    const v = parseFloat(elements.pitchSlider.value);
    elements.pitchVal.textContent = v > 0 ? `+${v.toFixed(1)}` : `${v.toFixed(1)}`;
    saveTTSSettings(elements);
};

// --- VOICE SELECTION ---
elements.voiceSelect.onchange = () => {
    saveTTSSettings(elements);
};

// --- RESET BUTTON ---
if (elements.resetSettings) {
    elements.resetSettings.onclick = () => {
        resetTTSSettings(elements, (msg) => {
            if (elements.status) elements.status.textContent = msg;
        }, editorManager);
    };
}

// --- INITIALIZATION ---
// Load persisted settings and capture saved voice
const savedSettings = loadTTSSettings(elements);

// Load voices for the restored engine
let voices = [];
const savedEngine = elements.engineSelect.value;
const savedVoice = getSavedVoice(savedEngine);
elements.voiceSelect.innerHTML = '<option value="">LOADING...</option>';
if (savedEngine === 'kokoro') {
    // Initialize Kokoro worker and load Kokoro voices
    kokoroPlayer.workerComm.initializeWorker().then(() => {
        if (kokoroPlayer.voices) {
            //debugLogArray(`kokoroPlayer.voices`, Object.keys(kokoroPlayer.voices));
            loadKokoroVoices(elements, kokoroPlayer.voices, savedVoice);
            saveTTSSettings(elements);
        }
    });
} else {
    // Load Web Speech voices (async — waits for voiceschanged if needed)
    voices = await loadWebSpeechVoices(elements, window.speechSynthesis, savedVoice);
    ttsController.voices = voices;
    saveIfNoSettings(elements);
}

// Update pitch warning
updatePitchWarning(elements.pitchSlider);

// --- ENGINE SWITCH ---
elements.engineSelect.onchange = async () => {
        const engine = elements.engineSelect.value;
        const savedVoice = getSavedVoice(engine);
        debugLog(`engineSelect.onchange(): savedVoice=${savedVoice}`);
        elements.voiceSelect.innerHTML = '<option value="">LOADING...</option>';
    
    if (engine === 'kokoro') {
        // Mobile Kokoro UX: Show info message and disable Kokoro on mobile
        if (isMobile) {
            elements.engineSelect.innerHTML = `
                <option value="webspeech" selected>Web Speech</option>
                <option value="kokoro" disabled>Kokoro TTS (unavailable on mobile)</option>
            `;
            // Add info indicator next to engine select
            let kokoroInfo = document.getElementById('kokoro-mobile-info');
            if (!kokoroInfo) {
                kokoroInfo = document.createElement('span');
                kokoroInfo.id = 'kokoro-mobile-info';
                kokoroInfo.className = 'kokoro-mobile-info';
                kokoroInfo.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                    <span>Kokoro disabled on mobile</span>
                `;
                elements.engineSelect.parentNode.insertBefore(kokoroInfo, elements.engineSelect.nextSibling);
            }
            kokoroInfo.classList.remove('hidden');
            updatePitchWarning(elements.pitchSlider);
            return;
        }

        debugLog(`webgpu=${navigator.gpu}`);
        debugLog(`KOKORO VOICES: LOADING...`, 'kokoroPlayer.workerComm.initializeWorker()');

        kokoroPlayer.workerComm.initializeWorker().then(() => {
            debugLogEnd(`KOKORO VOICES: LOADED`, 'kokoroPlayer.workerComm.initializeWorker()');
            if (kokoroPlayer.voices) {
                //debugLogArray(`kokoroPlayer.voices`, Object.keys(kokoroPlayer.voices));
                loadKokoroVoices(elements, kokoroPlayer.voices, savedVoice);
                saveTTSSettings(elements);
            } else {
                // Fallback: show placeholder
                elements.voiceSelect.innerHTML = '<option value="">Kokoro: INIT ERROR</option>';
                console.error(`elements.engineSelect.onchange(): Can't load Kokoro TTS voices. Voice array is empty.`);
            }
        });
    } else {
        // Remove info indicator when switching away from Kokoro
        const kokoroInfo = document.getElementById('kokoro-mobile-info');
        if (kokoroInfo) kokoroInfo.remove();
        debugLog(`Web Speech Voices: LOADING... -> savedVoice=${savedVoice}`);
        voices = await loadWebSpeechVoices(elements, window.speechSynthesis, savedVoice);
        debugLog(`Web Speech Voices: LOADED -> savedVoice=${savedVoice}`);
        ttsController.voices = voices;
    }
    updatePitchWarning(elements.pitchSlider);
    ttsController.setActiveEngine(engine);
};

// --- MODE SWITCHING ---
elements.btnVisual.onclick = () => editorManager.switchToVisual();
elements.btnSource.onclick = () => editorManager.switchToSource();

// --- KOKORO CHUNK-HIGHLIGHTING ---
kokoroPlayer._onChunkPlay = (index) => {
    const chunk = kokoroPlayer.chunks[index];
    if (!chunk) return;

    // Find the chunk text position within the full text
    let searchFrom = 0;
    for (let i = 0; i < index; i++) {
        const prevChunk = kokoroPlayer.chunks[i];
        if (prevChunk) {
            const pos = ttsController.kokoroTextToSpeak.indexOf(prevChunk.text, searchFrom);
            if (pos >= 0) searchFrom = pos + prevChunk.text.length;
        }
    }

    const chunkPos = ttsController.kokoroTextToSpeak.indexOf(chunk.text, searchFrom);
    if (chunkPos < 0) return;

    const offset = ttsController.kokoroStartOffset + chunkPos;
    const length = chunk.text.length;

    if (editorManager.isCurrentlySourceMode()) {
        elements.source.focus();
        elements.source.setSelectionRange(offset, offset + length);
    } else {
        highlightVisualWord(offset, length, elements.visual);
    }
};

// --- PLAYBACK TOGGLE ---
elements.btnTts.onclick = () => {
    ttsController.togglePlayback(
        () => ttsController.stopWebSpeech(),
        () => ttsController.stopKokoro(),
        () => loadTTSSettings(elements),
        (msg) => {
            if (elements.status) elements.status.textContent = msg;
        }
    );
};

// --- KEYBOARD SHORTCUT: Ctrl+Enter to toggle playback ---
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        ttsController.togglePlayback(
            () => ttsController.stopWebSpeech(),
            () => ttsController.stopKokoro(),
            () => loadTTSSettings(elements),
            (msg) => {
                if (elements.status) elements.status.textContent = msg;
            }
        );
    }
});

// --- DOWNLOAD AUDIO ---
document.getElementById('download-audio').onclick = () => {
    kokoroPlayer.downloadMerged();
};
});


debugLog(`app.js: END.`);
