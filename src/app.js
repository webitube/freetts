/**
 * app.js — FreeTTS Application Entry Point
 * 
 * Main initialization module for FreeTTS. Orchestrates module initialization,
 * DOM setup, event handlers, and state synchronization between components.
 * 
 * Architecture:
 * - EditorManager: Markdown editor (textarea + Milkdown WYSIWYG)
 * - TTSController: TTS engine orchestration (Web Speech + Kokoro)
 * - KokoroPlayer: Chunk-based Kokoro audio playback with mobile support
 * - Settings persistence: localStorage sync for engine, voice, speed, pitch
 * - Voice managers: Web Speech voice loading + Kokoro voice synchronization
 * - UI manager: Theme toggle, help modal, clipboard/download, link interception
 * 
 * Keyboard shortcuts:
 * - Ctrl+Enter / Cmd+Enter: Toggle TTS playback
 * 
 * Mobile considerations:
 * - Kokoro TTS is disabled on mobile devices due to ONNX Runtime constraints
 * - Mobile browsers show "Tap to play" indicators due to autoplay policies
 * - Web Speech API available on all platforms
 */

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

import {
    updateStatusMsg,
    capitalizeMsg,
    updateSelectedEngine
} from './app-utils.js';

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
import { toggleHidden } from './app-utils.js';

import {
    AudioCardStore
} from './audio-card-store.js';


setDebugMode(true);
debugLog(`app.js: BEGIN...`);

/**
 * Application initialization — runs when DOM is fully loaded.
 * 
 * Sets up:
 * 1. Browser detection (Safari, mobile)
 * 2. DOM element references
 * 3. Module initialization (EditorManager, TTSController, KokoroPlayer)
 * 4. UI initialization (theme, modal, clipboard)
 * 5. Voice loading (Web Speech or Kokoro)
 * 6. Event handlers (mode switching, engine switching, playback toggle)
 * 7. Settings persistence and restoration
 */
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
    ttsStatus: document.getElementById('tts-status'),
    activeDeviceMsg: document.getElementById('active-device-msg'),
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
    //---------------------------------------------------------------------------
    // statusCallback - Kokoro-specific status goes to ttsStatus element
    //---------------------------------------------------------------------------
    if (!msg.length || kokoroPlayer.status === 'ready') {
        msg = ttsController.getIsSpeaking() ? 'Speaking...' : 'Ready.';
    }

    const statusEl = document.getElementById('tts-status');
    if (statusEl) {
        statusEl.textContent = msg;
    }

    // Show download button when Kokoro TTS is active and has merged audio
    const dlBtn = document.getElementById('download-audio');
    toggleHidden(dlBtn, ttsController.getActiveEngine() !== 'kokoro' || !kokoroPlayer.mergedBlob);
}, (activeDevice) => {
    //---------------------------------------------------------------------------
    // activeDeviceCallback: Update the TTS active-device-msg
    //---------------------------------------------------------------------------
    //elements.activeDeviceMsg.textContent = `TTS: ${activeDevice.toUpperCase()}`;
    //const selectedEngine = elements.engineSelect.options[elements.engineSelect.selectedIndex].text;
    //document.getElementById('active-device-msg').textContent = `${selectedEngine}: ${activeDevice.toLocaleUpperCase()}`;
    updateSelectedEngine(kokoroPlayer.getActiveDevice());
}, (active) => {
    //---------------------------------------------------------------------------
    // uiStateCallback
    // Sync isSpeaking state with the UI play/stop button
    //---------------------------------------------------------------------------
    ttsController.setIsSpeaking(active);
    elements.playIcon.classList.toggle('hidden', active);
    elements.stopIcon.classList.toggle('hidden', !active);
    elements.btnTts.classList.toggle('text-red-600', active);
    elements.btnTts.classList.toggle('text-blue-600', !active);
}, (offset, length) => {
    //---------------------------------------------------------------------------
    // scrollCallback
    // Scroll source-editor textarea to show the highlighted text region
    // This callback is stored and invoked from _onChunkPlay, not here
    //---------------------------------------------------------------------------
    kokoroPlayer.scrollToSelection(elements.source);
}, () => {
    //---------------------------------------------------------------------------
    // onPlayOverCallback: turn-off the selection
    //---------------------------------------------------------------------------
    elements.source.focus();
    const end = elements.source.selectionEnd;
    elements.source.setSelectionRange(end, end);
});

// Initialize TTS Controller
const ttsController = new TTSController(
    elements,
    editorManager,
    kokoroPlayer,
    highlightVisualWord,
    getVisualCursorInfo,
    [], // voices will be populated by loadWebSpeechVoices
    isSafari,
    (isSpeaking) => {
        //debugLog(`ttsController.isSpeakingCallback(): isSpeaking=${isSpeaking}`);

        const ttsStatus = document.getElementById('tts-status');
        ttsStatus.textContent = isSpeaking ? "Speaking..." : "Ready.";
    }
);

// --- UI INITIALIZATION ---
initThemeToggle(elements.themeToggle);
initHelpModal(elements);
initClipboardAndDownload(elements, (msg) => {
    updateStatusMsg(elements.ttsStatus, msg, kokoroPlayer.getActiveDevice());
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
            updateStatusMsg(elements.ttsStatus, msg, kokoroPlayer.getActiveDevice());
        }, editorManager);
    };
}

// --- INITIALIZATION ---
// Load persisted settings and capture saved voice
const savedSettings = loadTTSSettings(elements);

// Load voices for the restored engine
let voices = [];
const savedEngine = elements.engineSelect.value;
ttsController.setActiveEngine(savedEngine);
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
    updateSelectedEngine(kokoroPlayer.getActiveDevice());
    
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
    const ratio = offset / length;

    if (editorManager.isCurrentlySourceMode()) {
        elements.source.focus();
        elements.source.setSelectionRange(offset, offset + length);
        // Scroll the textarea so the highlighted text is visible
        kokoroPlayer.scrollCallback?.(offset, length);
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
            updateStatusMsg(elements.ttsStatus, msg, kokoroPlayer.getActiveDevice());
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
                updateStatusMsg(elements.ttsStatus, msg, kokoroPlayer.getActiveDevice());
            }
        );
    }
});

// --- DOWNLOAD AUDIO ---
document.getElementById('download-audio').onclick = () => {
    kokoroPlayer.downloadMerged();
};
});

updateSelectedEngine();

AudioCardStore.getInstance().setsta
const statusMessage = AudioCardStore.getStatusMessage();
debugLog(`statusMessage=${statusMessage}`);

debugLog(`app.js: END.`);
