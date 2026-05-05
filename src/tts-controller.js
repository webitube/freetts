import { cleanMarkdown } from './highlighting-utils.js';

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
    constructor(elements, editorManager, kokoroPlayer, highlightVisualWord, getVisualCursorInfo, voices, isSafari) {
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

        const selectionText = window.getSelection().toString().trim();
        let textToSpeak = '';
        let startOffset = 0;

        if (selectionText) {
            textToSpeak = selectionText;
            startOffset = this.editorManager.isCurrentlySourceMode() 
                ? (this.elements.source.selectionStart || 0) 
                : this.getVisualCursorInfo(this.elements.visual).offset;
        } else if (this.editorManager.isCurrentlySourceMode()) {
            startOffset = this.elements.source.selectionStart || 0;
            textToSpeak = this.elements.source.value.substring(startOffset);
        } else {
            const info = this.getVisualCursorInfo(this.elements.visual);
            startOffset = info.offset;
            textToSpeak = info.text.substring(startOffset);
        }

        if (!textToSpeak.trim()) {
            statusCallback('Please place cursor or select text.');
            setTimeout(() => statusCallback('Ready.'), 2000);
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
        const selectedVoice = this.voices[this.elements.voiceSelect.value];
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
        this.isSpeaking = active;
        this.elements.playIcon.classList.toggle('hidden', active);
        this.elements.stopIcon.classList.toggle('hidden', !active);
        this.elements.btnTts.classList.toggle('text-red-600', active);
        this.elements.btnTts.classList.toggle('text-blue-600', !active);
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
        this.isSpeaking = state;
    }
}
