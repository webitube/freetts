import { cleanMarkdown } from './highlighting-utils';
import { setUIState as setPlaybackUIState } from './ui-manager';
import { resetStatusAfterDelay } from './app-utils';
import { AppStore, EngineEnum } from './app-store';
import { debugLog } from './debug-log';
import { ReactEventArgs } from '../ReactiveTypescript/src/types.js';


/**
 * TTSController handles Text-to-Speech playback logic for both
 * Web Speech API and Kokoro TTS engines.
 * Now backed by AppStore reactive state.
 * 
 * @example
 * // Basic usage
 * const controller = new TTSController(elements, editorManager, kokoroPlayer, ...);
 * controller.togglePlayback(stopWebSpeech, stopKokoro, loadTTSSettings, statusCallback);
 */
export class TTSController {
    /** DOM elements map used by the controller. */
    private elements: Record<string, unknown>;
    /** Manager for switching between Source and Visual editor modes. */
    private editorManager: any;
    /** Kokoro TTS player instance for neural speech synthesis. */
    private kokoroPlayer: any;
    /** Callback to highlight a word in the visual editor. */
    private highlightVisualWord: (offset: number, length: number, el: HTMLElement) => void;
    /** Function to retrieve cursor position and text from the visual editor. */
    private getVisualCursorInfo: (el: HTMLElement) => { text: string; offset: number };
    /** Available voices from the Web Speech API. */
    private voices: any[];
    /** Flag indicating whether the current browser is Safari. */
    private isSafari: boolean;
    /** Starting offset for speech synthesis highlighting in source mode. */
    private speechOffsetStart: number = 0;
    /** The text currently being spoken by Kokoro TTS. */
    public kokoroTextToSpeak: string = '';
    /** The starting offset for Kokoro TTS playback. */
    public kokoroStartOffset: number = 0;
    /** Callback invoked whenever the speaking state changes. */
    private isSpeakingCallback: (isSpeaking: boolean) => void;

    /**
     * Creates a new TTSController instance.
     * 
     * @param elements - Map of DOM elements used by the controller.
     * @param editorManager - Manager for switching between Source and Visual editor modes.
     * @param kokoroPlayer - Kokoro TTS player instance for neural speech synthesis.
     * @param highlightVisualWord - Callback to highlight a word in the visual editor.
     * @param getVisualCursorInfo - Function to retrieve cursor position and text from the visual editor.
     * @param voices - Available voices from the Web Speech API.
     * @param isSafari - Flag indicating whether the current browser is Safari.
     * @param isSpeakingCallback - Optional callback invoked whenever the speaking state changes.
     */
    constructor(
        elements: Record<string, unknown>,
        editorManager: any,
        kokoroPlayer: any,
        highlightVisualWord: (offset: number, length: number, el: HTMLElement) => void,
        getVisualCursorInfo: (el: HTMLElement) => { text: string; offset: number },
        voices: any[],
        isSafari: boolean,
        isSpeakingCallback?: (isSpeaking: boolean) => void,
    ) {
        this.elements = elements;
        this.editorManager = editorManager;
        this.kokoroPlayer = kokoroPlayer;
        this.highlightVisualWord = highlightVisualWord;
        this.getVisualCursorInfo = getVisualCursorInfo;
        this.voices = voices;
        this.isSafari = isSafari;
        this.speechOffsetStart = 0;
        this.kokoroTextToSpeak = '';
        this.kokoroStartOffset = 0;
        this.isSpeakingCallback = typeof isSpeakingCallback === 'function' ? isSpeakingCallback : () => {};
        this.isSpeakingCallback(AppStore.instance.isSpeaking.get());

        // Subscribe to playback state changes
        AppStore.instance.isPlaying.subscribe((args: ReactEventArgs<boolean>) => {
            const isPlaying = args.data;
            this.handlePlaybackStateChange(isPlaying);
        });
    }

    /**
     * Handles changes to the global isPlaying state.
     * @param isPlaying - Whether playback should be active.
     */
    private handlePlaybackStateChange(isPlaying: boolean): void {
        if (isPlaying) {
            this.startPlayback();
        } else {
            this.stopPlayback();
        }
    }

    /**
     * Orchestrates the start of playback based on current engine and editor state.
     */
    private startPlayback(): void {
        // Load settings into UI before starting
        const loadTTSSettings = (elements: any) => {
            // This is a placeholder for the actual loadTTSSettings logic 
            // which is usually passed in from app.ts. 
            // Since we are now reactive, we should ensure the UI is synced.
        };

        if (this.editorManager.isCurrentlySourceMode()) {
            const sourceEl = (this.elements as any).source as HTMLTextAreaElement;
            if (document.activeElement !== sourceEl) {
                sourceEl?.focus();
                sourceEl?.setSelectionRange(0, 0);
            }
        }

        const selectionText = window.getSelection()?.toString().trim() ?? '';
        const { textToSpeak, startOffset } = this._getTextAndOffset(selectionText);

        if (!textToSpeak.trim()) {
            // We can't speak, so we reset isPlaying to false
            AppStore.instance.isPlaying.set(false);
            debugLog(`startPlayback(): textToSpeak.Trim() is empty: isPlaying set to false: isPlaying=${AppStore.instance.isPlaying.get()}`);
            return;
        }

        debugLog(`startPlayback(): About to speak with engine=${AppStore.instance.engine.get()}`);
        if (AppStore.instance.engine.get() === EngineEnum.Kokoro) {
            this.speakWithKokoro(textToSpeak, startOffset);
        } else {
            this.speakWithWebSpeech(textToSpeak, startOffset, () => this.stopPlayback());
        }
    }

    /**
     * Orchestrates the stop of playback for the active engine.
     */
    private stopPlayback(): void {
        if (AppStore.instance.engine.get() === EngineEnum.Kokoro) {
            this.stopKokoro();
        } else {
            this.stopWebSpeech();
        }
    }

    /**
     * Toggles TTS playback on/off. (Deprecated in favor of AppStore.isPlaying)
     * Kept for backward compatibility if needed, but now just toggles the store.
     */
    togglePlayback(
        stopWebSpeech: () => void,
        stopKokoro: () => void,
        loadTTSSettings: () => void,
        statusCallback: (msg: string) => void,
    ): void {
        AppStore.instance.isPlaying.set(!AppStore.instance.isPlaying.get());
    }

    /**
     * Sets the active TTS engine.
     * 
     * @param engine - The engine identifier (e.g., `EngineEnum.Kokoro` or `EngineEnum.WebSpeech`).
     */
    setActiveEngine(engine: string): void {
        AppStore.instance.engine.set(engine as EngineEnum);
    }

    /**
     * Gets the currently active TTS engine.
     * 
     * @returns The engine identifier string.
     */
    getActiveEngine(): string {
        return AppStore.instance.engine.get();
    }

    /**
     * Speaks the given text using the Web Speech API with word-level highlighting.
     * 
     * @param textToSpeak - The text to synthesize.
     * @param startOffset - The character offset in the editor where the text begins (for highlighting).
     * @param stopWebSpeech - Function to stop Web Speech API playback.
     */
    speakWithWebSpeech(textToSpeak: string, startOffset: number, stopWebSpeech: () => void): void {
        const cleanText = cleanMarkdown(textToSpeak);
        const utter = new SpeechSynthesisUtterance(cleanText);
        const selectedVoice = this.voices.find(v => v.name === (this.elements as any).voiceSelect.value);
        if (selectedVoice) utter.voice = selectedVoice;
        utter.rate = parseFloat((this.elements as any).speedSlider.value);
        if (!this.isSafari) utter.pitch = 1 + parseInt((this.elements as any).pitchSlider.value) / 12;

        utter.onboundary = (e: SpeechSynthesisEvent) => {
            if (e.name !== 'word') return;
            const wordMatch = e.utterance.text.substring(e.charIndex).match(/\w+/);
            const wordLen = wordMatch ? wordMatch[0].length : 0;
            if (this.editorManager.isCurrentlySourceMode()) {
                const sourceEl = (this.elements as any).source as HTMLTextAreaElement;
                sourceEl?.focus();
                sourceEl?.setSelectionRange(startOffset + e.charIndex, startOffset + e.charIndex + wordLen);
            } else {
                const visualEl = (this.elements as any).visual as HTMLElement;
                this.highlightVisualWord(startOffset + e.charIndex, wordLen, visualEl);
            }
        };
        utter.onstart = () => this.setUIState(true);
        utter.onend = () => {
            this.setUIState(false);
            if (!this.editorManager.isCurrentlySourceMode()) {
                window.getSelection()?.removeAllRanges();
            }
        };
        utter.onerror = () => this.setUIState(false);
        this.speechOffsetStart = startOffset;
        window.speechSynthesis.speak(utter);
    }

    /**
     * Stops Web Speech API playback and resets the UI state.
     */
    stopWebSpeech(): void {
        window.speechSynthesis.cancel();
        this.setUIState(false);
    }

    /**
     * Determines the text to speak and its starting offset based on the current editor mode
     * and user selection. If text is selected, returns the selection; otherwise returns
     * the remaining text from the cursor position.
     * 
     * @param selectionText - The currently selected text (may be empty).
     * @returns An object containing the text to speak and its starting offset.
     */
    _getTextAndOffset(selectionText: string): { textToSpeak: string; startOffset: number } {
        if (selectionText) {
            const startOffset = this.editorManager.isCurrentlySourceMode()
                ? ((this.elements as any).source.selectionStart ?? 0)
                : this.getVisualCursorInfo((this.elements as any).visual).offset;
            return { textToSpeak: selectionText, startOffset };
        }

        if (this.editorManager.isCurrentlySourceMode()) {
            const sourceEl = (this.elements as any).source as HTMLTextAreaElement;
            const startOffset = sourceEl?.selectionStart ?? 0;
            return {
                textToSpeak: sourceEl?.value.substring(startOffset) ?? '',
                startOffset,
            };
        }

        const visualEl = (this.elements as any).visual as HTMLElement;
        const info = this.getVisualCursorInfo(visualEl);
        return {
            textToSpeak: info.text.substring(info.offset),
            startOffset: info.offset,
        };
    }

    /**
     * Speaks the given text using the Kokoro neural TTS engine.
     * 
     * @param textToSpeak - The text to synthesize.
     * @param startOffset - The character offset in the editor where the text begins.
     */
    speakWithKokoro(textToSpeak: string, startOffset: number): void {
        this.kokoroTextToSpeak = textToSpeak;
        this.kokoroStartOffset = startOffset;
        const voice = (this.elements as any).voiceSelect.value || 'af_heart';
        const speed = parseFloat((this.elements as any).speedSlider.value);
        this.kokoroPlayer.play(textToSpeak, voice, speed);
    }

    /**
     * Stops Kokoro TTS playback.
     */
    stopKokoro(): void {
        this.kokoroPlayer.stop();
    }

    /**
     * Updates the UI state to reflect the current playback status.
     * 
     * @param active - Whether playback is currently active.
     */
    setUIState(active: boolean): void {
        setPlaybackUIState(this.elements, active);
        this.setIsSpeaking(active);
    }

    /**
     * Gets the current speaking state.
     * 
     * @returns True if TTS is currently speaking, false otherwise.
     */
    getIsSpeaking(): boolean {
        return AppStore.instance.isSpeaking.get();
    }

    /**
     * Sets the speaking state and notifies the callback if the state has changed.
     * 
     * @param state - The new speaking state.
     */
    setIsSpeaking(state: boolean): void {
        if (AppStore.instance.isSpeaking.get() !== state) {
            AppStore.instance.isSpeaking.set(state);
            this.isSpeakingCallback(state);
        }
    }
}
