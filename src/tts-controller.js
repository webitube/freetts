import { cleanMarkdown } from './highlighting-utils.js';
import { setUIState as setPlaybackUIState } from './ui-manager.js';
import { resetStatusAfterDelay } from './app-utils.js';

/**
 * TTSController handles Text-to-Speech playback logic for both
 * Web Speech API and Kokoro TTS engines.
 */
export class TTSController {
    /**
     * @param {Object} elements - DOM elements object
     * @param {Object} editorManager - EditorManager instance
     * @param {Object} kokoroPlayer - KokoroPlayer instance
     * @param {Function} highlightVisualWord - Function to highlight words in Visual mode
     * @param {Function} getVisualCursorInfo - Function to get cursor info in Visual mode
     * @param {Array} voices - Web Speech voices array
     * @param {boolean} isSafari - Whether running on Safari
     */
    constructor(elements, editorManager, kokoroPlayer, highlightVisualWord, getVisualCursorInfo, voices, isSafari, isSpeakingCallback) {
        this.elements = elements;
        this.editorManager = editorManager;
        this.kokoroPlayer = kokoroPlayer;
        this.highlightVisualWord = highlightVisualWord;
        this.getVisualCursorInfo = getVisualCursorInfo;
        this.voices = voices;
        this.isSafari = isSafari;
        this.activeEngine = 'webspeech';
        this.isSpeaking = false;
        this.speechOffsetStart = 0;
        this.kokoroTextToSpeak = '';
        this.kokoroStartOffset = 0;
        this.isSpeakingCallback = typeof isSpeakingCallback === 'function' ? isSpeakingCallback : () => {};
        this.isSpeakingCallback(this.isSpeaking);
    }

    /**
     * Set the active TTS engine
     * @param {string} engine - 'webspeech' or 'kokoro'
     */
    setActiveEngine(engine) {
        this.activeEngine = engine;
    }

    /**
     * Get the active TTS engine
     * @returns {string}
     */
    getActiveEngine() {
        return this.activeEngine;
    }

    /**
     * Toggle playback based on current state
     * @param {Function} stopWebSpeech - Function to stop Web Speech
     * @param {Function} stopKokoro - Function to stop Kokoro
     * @param {Function} loadTTSSettings - Function to load settings
     * @param {Function} statusCallback - Callback to update status message
     */
    togglePlayback(stopWebSpeech, stopKokoro, loadTTSSettings, statusCallback) {
        // Load persisted settings before playing
        loadTTSSettings(this.elements);
        
        if (this.isSpeaking) {
            if (this.activeEngine === 'kokoro') {
                stopKokoro();
            } else {
                stopWebSpeech();
            }
            return;
        }

        // Auto-focus source editor and place cursor at start if not already focused
        if (this.editorManager.isCurrentlySourceMode()) {
            const sourceEl = this.elements.source;
            if (document.activeElement !== sourceEl) {
                if (typeof sourceEl.focus === 'function') {
                    sourceEl.focus();
                }
                if (typeof sourceEl.setSelectionRange === 'function') {
                    sourceEl.setSelectionRange(0, 0);
                }
            }
        }

        const selectionText = window.getSelection().toString().trim();
        const { textToSpeak, startOffset } = this._getTextAndOffset(selectionText);

        if (!textToSpeak.trim()) {
            statusCallback('Please place cursor or select text.');
            resetStatusAfterDelay(statusCallback);
            return;
        }

        if (this.activeEngine === 'kokoro') {
            this.speakWithKokoro(textToSpeak, startOffset);
        } else {
            this.speakWithWebSpeech(textToSpeak, startOffset, stopWebSpeech);
        }
    }

    /**
     * Speak text using Web Speech API
     * @param {string} textToSpeak - Text to speak
     * @param {number} startOffset - Start offset for highlighting
     * @param {Function} stopWebSpeech - Function to stop Web Speech
     */
    speakWithWebSpeech(textToSpeak, startOffset, stopWebSpeech) {
        const cleanText = cleanMarkdown(textToSpeak);
        const utter = new SpeechSynthesisUtterance(cleanText);
        // Look up voice by name from the voices array
        const selectedVoice = this.voices.find(v => v.name === this.elements.voiceSelect.value);
        if (selectedVoice) utter.voice = selectedVoice;
        utter.rate = parseFloat(this.elements.speedSlider.value);
        if (!this.isSafari) utter.pitch = 1 + parseInt(this.elements.pitchSlider.value) / 12;
        
        utter.onboundary = (e) => {
            if (e.name !== 'word') return;
            const wordMatch = e.utterance.text.substring(e.charIndex).match(/\w+/);
            const wordLen = wordMatch ? wordMatch[0].length : 0;
            if (this.editorManager.isCurrentlySourceMode()) {
                this.elements.source.focus();
                this.elements.source.setSelectionRange(startOffset + e.charIndex, startOffset + e.charIndex + wordLen);
            } else {
                this.highlightVisualWord(startOffset + e.charIndex, wordLen, this.elements.visual);
            }
        };
        utter.onstart = () => this.setUIState(true);
        utter.onend = () => { 
            this.setUIState(false); 
            if (!this.editorManager.isCurrentlySourceMode()) {
                window.getSelection().removeAllRanges();
            }
        };
        utter.onerror = () => this.setUIState(false);
        this.speechOffsetStart = startOffset;
        window.speechSynthesis.speak(utter);
    }

    /**
     * Stop Web Speech playback
     */
    stopWebSpeech() {
        window.speechSynthesis.cancel();
        this.setUIState(false);
    }

    /**
     * Speak text using Kokoro TTS
     * @param {string} textToSpeak - Text to speak
     * @param {number} startOffset - Start offset for highlighting
     */
    _getTextAndOffset(selectionText) {
        if (selectionText) {
            const startOffset = this.editorManager.isCurrentlySourceMode()
                ? (this.elements.source.selectionStart || 0)
                : this.getVisualCursorInfo(this.elements.visual).offset;
            return { textToSpeak: selectionText, startOffset };
        }

        if (this.editorManager.isCurrentlySourceMode()) {
            const startOffset = this.elements.source.selectionStart || 0;
            return {
                textToSpeak: this.elements.source.value.substring(startOffset),
                startOffset
            };
        }

        const info = this.getVisualCursorInfo(this.elements.visual);
        return {
            textToSpeak: info.text.substring(info.offset),
            startOffset: info.offset
        };
    }

    speakWithKokoro(textToSpeak, startOffset) {
        this.kokoroTextToSpeak = textToSpeak;
        this.kokoroStartOffset = startOffset;
        const voice = this.elements.voiceSelect.value || 'af_heart';
        const speed = parseFloat(this.elements.speedSlider.value);
        this.kokoroPlayer.play(textToSpeak, voice, speed);
    }

    /**
     * Stop Kokoro TTS playback
     */
    stopKokoro() {
        this.kokoroPlayer.stop();
    }

    /**
     * Update UI state for playback
     * @param {boolean} active - Whether playback is active
     */
    setUIState(active) {
        setPlaybackUIState(this.elements, active);
        this.setIsSpeaking(active);
    }

    /**
     * Get current speaking state
     * @returns {boolean}
     */
    getIsSpeaking() {
        return this.isSpeaking;
    }

    /**
     * Set current speaking state
     * @param {boolean} state - Speaking state
     */
    setIsSpeaking(state) {
        if (this.isSpeaking != state)
        {
            this.isSpeaking = state;
            this.isSpeakingCallback(state);
        }
    }
}
