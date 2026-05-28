/**
 * app.ts — FreeTTS Application Entry Point
 *
 * Main initialization module for FreeTTS. Orchestrates module initialization,
 * DOM setup, event handlers, and state synchronization between components.
 *
 * Architecture:
 * - AppStore: Centralized reactive state (ReactiveTypescript)
 * - EditorManager: Markdown editor (textarea + Milkdown WYSIWYG)
 * - TTSController: TTS engine orchestration (Web Speech + Kokoro)
 * - KokoroPlayer: Chunk-based Kokoro audio playback with mobile support
 * - Settings persistence: localStorage sync via AppStore
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
    setDebugMode,
} from './global-switches';

import {
    debugLog,
    debugLogEnd,
} from './debug-log';

import {
    updateStatusMsg,
    updateSelectedEngine,
    toggleHidden,
} from './app-utils';

import { EditorManager } from './editor-manager';
import { TTSController } from './tts-controller';
import { KokoroPlayer } from './kokoro-player';
import { highlightVisualWord, getVisualCursorInfo } from './highlighting-utils';
import {
    saveTTSSettings,
    loadTTSSettings,
    resetTTSSettings,
    getSavedVoice,
    saveIfNoSettings,
} from './settings-persistence';
import {
    initThemeToggle,
    initHelpModal,
    initClipboardAndDownload,
} from './ui-manager';
import {
    loadWebSpeechVoices,
    loadKokoroVoices,
    updatePitchWarning,
} from './voice-manager';
import { AppStore } from './app-store';

setDebugMode(false);
debugLog(`app.ts: BEGIN...`);

/**
 * Application initialization — runs when DOM is fully loaded.
 */
document.addEventListener('DOMContentLoaded', async () => {
    // --- INITIAL DATA ---
    const defaultTextResponse = await fetch('DefaultText.md');
    const initialValue = await defaultTextResponse.text();

    // --- BROWSER DETECTION ---
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        || (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);

    // --- DOM ELEMENTS ---
    const elements: Record<string, HTMLElement | HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement | null> = {
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
    if (elements.source) (elements.source as HTMLTextAreaElement).value = initialValue;

    // If there are no local storage settings, then create one.
    saveIfNoSettings(elements);

    // Initialize KokoroPlayer
    const kokoroPlayer = new KokoroPlayer('kokoro-chunk-list', (msg: string) => {
        if (!msg.length || kokoroPlayer.status === 'ready') {
            msg = ttsController.getIsSpeaking() ? 'Speaking...' : 'Ready.';
        }

        const statusEl = document.getElementById('tts-status');
        if (statusEl) {
            statusEl.textContent = msg;
        }

        const dlBtn = document.getElementById('download-audio');
        toggleHidden(dlBtn, ttsController.getActiveEngine() !== 'kokoro' || !kokoroPlayer.mergedBlob);
    }, (activeDevice: string) => {
        updateSelectedEngine(kokoroPlayer.getActiveDevice());
    }, (active: boolean) => {
        ttsController.setIsSpeaking(active);
        if (elements.playIcon) elements.playIcon.classList.toggle('hidden', active);
        if (elements.stopIcon) elements.stopIcon.classList.toggle('hidden', !active);
        if (elements.btnTts) {
            elements.btnTts.classList.toggle('text-red-600', active);
            elements.btnTts.classList.toggle('text-blue-600', !active);
        }
    }, (offset: number, length: number) => {
        if (elements.source) {
            kokoroPlayer.scrollToSelection(elements.source as HTMLTextAreaElement);
        }
    }, () => {
        if (elements.source) {
            (elements.source as HTMLTextAreaElement).focus();
            const end = (elements.source as HTMLTextAreaElement).selectionEnd;
            (elements.source as HTMLTextAreaElement).setSelectionRange(end, end);
        }
    });

    // Initialize TTS Controller
    const ttsController = new TTSController(
        elements,
        editorManager,
        kokoroPlayer,
        highlightVisualWord,
        getVisualCursorInfo,
        [],
        isSafari,
        (isSpeaking: boolean) => {
            const ttsStatus = document.getElementById('tts-status');
            if (ttsStatus) ttsStatus.textContent = isSpeaking ? 'Speaking...' : 'Ready.';
        },
    );

    // --- UI INITIALIZATION ---
    initThemeToggle(elements.themeToggle);
    initHelpModal(elements);
    initClipboardAndDownload(elements, (msg: string) => {
        updateStatusMsg(elements.ttsStatus, msg, kokoroPlayer.getActiveDevice());
    });

    // --- SLIDER DISPLAY ---
    if (elements.speedSlider) {
        (elements.speedSlider as HTMLInputElement).oninput = () => {
            if (elements.speedVal) {
                elements.speedVal.textContent = `${parseFloat((elements.speedSlider as HTMLInputElement).value).toFixed(1)}×`;
            }
            saveTTSSettings(elements);
        };
    }
    if (elements.pitchSlider) {
        (elements.pitchSlider as HTMLInputElement).oninput = () => {
            const v = parseFloat((elements.pitchSlider as HTMLInputElement).value);
            if (elements.pitchVal) {
                elements.pitchVal.textContent = v > 0 ? `+${v.toFixed(1)}` : `${v.toFixed(1)}`;
            }
            saveTTSSettings(elements);
        };
    }

    // --- VOICE SELECTION ---
    if (elements.voiceSelect) {
        (elements.voiceSelect as HTMLSelectElement).onchange = () => {
            saveTTSSettings(elements);
        };
    }

    // --- RESET BUTTON ---
    if (elements.resetSettings) {
        elements.resetSettings.onclick = () => {
            resetTTSSettings(elements, (msg: string) => {
                updateStatusMsg(elements.ttsStatus, msg, kokoroPlayer.getActiveDevice());
            }, editorManager);
        };
    }

    // --- INITIALIZATION ---
    const savedSettings = loadTTSSettings(elements);

    // Load voices for the restored engine
    let voices: any[] = [];
    const savedEngine = (elements.engineSelect as HTMLSelectElement)?.value ?? 'webspeech';
    ttsController.setActiveEngine(savedEngine);
    const savedVoice = getSavedVoice(savedEngine);
    if (elements.voiceSelect) (elements.voiceSelect as HTMLSelectElement).innerHTML = '<option value="">LOADING...</option>';

    if (savedEngine === 'kokoro') {
        kokoroPlayer.workerComm.initializeWorker().then(() => {
            if (kokoroPlayer.voices) {
                loadKokoroVoices(elements, kokoroPlayer.voices, savedVoice);
                saveTTSSettings(elements);
            }
        });
    } else {
        voices = await loadWebSpeechVoices(elements, window.speechSynthesis, savedVoice);
        ttsController.voices = voices;
        saveIfNoSettings(elements);
    }

    // Update pitch warning
    updatePitchWarning(elements.pitchSlider as HTMLInputElement);

    // --- ENGINE SWITCH ---
    if (elements.engineSelect) {
        (elements.engineSelect as HTMLSelectElement).onchange = async () => {
            const engine = (elements.engineSelect as HTMLSelectElement).value;
            const savedVoice = getSavedVoice(engine);
            debugLog(`engineSelect.onchange(): savedVoice=${savedVoice}`);
            if (elements.voiceSelect) (elements.voiceSelect as HTMLSelectElement).innerHTML = '<option value="">LOADING...</option>';
            updateSelectedEngine(kokoroPlayer.getActiveDevice());

            if (engine === 'kokoro') {
                if (isMobile) {
                    if (elements.engineSelect) {
                        (elements.engineSelect as HTMLSelectElement).innerHTML = `
                            <option value="webspeech" selected>Web Speech</option>
                            <option value="kokoro" disabled>Kokoro TTS (unavailable on mobile)</option>
                        `;
                    }
                    let kokoroInfo = document.getElementById('kokoro-mobile-info');
                    if (!kokoroInfo) {
                        kokoroInfo = document.createElement('span');
                        kokoroInfo.id = 'kokoro-mobile-info';
                        kokoroInfo.className = 'kokoro-mobile-info';
                        kokoroInfo.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                            <span>Kokoro disabled on mobile</span>
                        `;
                        if (elements.engineSelect) {
                            elements.engineSelect.parentNode?.insertBefore(kokoroInfo, elements.engineSelect.nextSibling);
                        }
                    }
                    kokoroInfo.classList.remove('hidden');
                    updatePitchWarning(elements.pitchSlider as HTMLInputElement);
                    return;
                }

                debugLog(`webgpu=${navigator.gpu}`);
                debugLog(`KOKORO VOICES: LOADING...`, 'kokoroPlayer.workerComm.initializeWorker()');

                kokoroPlayer.workerComm.initializeWorker().then(() => {
                    debugLogEnd(`KOKORO VOICES: LOADED`, 'kokoroPlayer.workerComm.initializeWorker()');
                    if (kokoroPlayer.voices) {
                        loadKokoroVoices(elements, kokoroPlayer.voices, savedVoice);
                        saveTTSSettings(elements);
                    } else {
                        if (elements.voiceSelect) (elements.voiceSelect as HTMLSelectElement).innerHTML = '<option value="">Kokoro: INIT ERROR</option>';
                        console.error(`Can't load Kokoro TTS voices. Voice array is empty.`);
                    }
                });
            } else {
                const kokoroInfo = document.getElementById('kokoro-mobile-info');
                if (kokoroInfo) kokoroInfo.remove();
                debugLog(`Web Speech Voices: LOADING... -> savedVoice=${savedVoice}`);
                voices = await loadWebSpeechVoices(elements, window.speechSynthesis, savedVoice);
                debugLog(`Web Speech Voices: LOADED -> savedVoice=${savedVoice}`);
                ttsController.voices = voices;
            }
            updatePitchWarning(elements.pitchSlider as HTMLInputElement);
            ttsController.setActiveEngine(engine);
        };
    }

    // --- MODE SWITCHING ---
    if (elements.btnVisual) {
        elements.btnVisual.onclick = () => editorManager.switchToVisual();
    }
    if (elements.btnSource) {
        elements.btnSource.onclick = () => editorManager.switchToSource();
    }

    // --- KOKORO CHUNK-HIGHLIGHTING ---
    kokoroPlayer._onChunkPlay = (index: number) => {
        const chunk = kokoroPlayer.chunks[index];
        if (!chunk) return;

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
            if (elements.source) {
                (elements.source as HTMLTextAreaElement).focus();
                (elements.source as HTMLTextAreaElement).setSelectionRange(offset, offset + length);
                kokoroPlayer.scrollCallback?.(offset, length);
            }
        } else {
            if (elements.visual) {
                highlightVisualWord(offset, length, elements.visual as HTMLElement);
            }
        }
    };

    // --- PLAYBACK TOGGLE ---
    if (elements.btnTts) {
        elements.btnTts.onclick = () => {
            AppStore.instance.isPlaying.set(!AppStore.instance.isPlaying.get());
        };
    }

    // --- KEYBOARD SHORTCUT: Ctrl+Enter to toggle playback ---
    document.addEventListener('keydown', (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            AppStore.instance.isPlaying.set(!AppStore.instance.isPlaying.get());
        }
    });

    // --- DOWNLOAD AUDIO ---
    const downloadAudioBtn = document.getElementById('download-audio');
    if (downloadAudioBtn) {
        downloadAudioBtn.onclick = () => {
            kokoroPlayer.downloadMerged();
        };
    }
});

updateSelectedEngine();
debugLog(`app.ts: END.`);
