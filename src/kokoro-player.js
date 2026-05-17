/**
 * KokoroPlayer — chunk-based TTS player for Kokoro TTS.
 *
 * Each audio chunk is rendered as an independent <audio> element.
 * Users can click any chunk to seek into it. Chunks auto-play in sequence.
 *
 * Communicates with tts-worker.js via postMessage.
 * All DOM updates go through the containerId + statusCallback.
 *
 * Refactored into smaller modules:
 * - kokoro-worker-communication.js - Worker management
 * - kokoro-audio-player.js - Audio playback
 * - kokoro-chunk-manager.js - Chunk state logic
 * - kokoro-chunk-renderer.js - Chunk rendering
 */
import { WorkerCommunication } from './kokoro-worker-communication.js';
import { AudioPlayer } from './kokoro-audio-player.js';
import { ChunkManager } from './kokoro-chunk-manager.js';
import { ChunkRenderer } from './kokoro-chunk-renderer.js';
import { AudioCardStore } from './audio-card-store.js';

import {
    debugLog,
    debugLogEnd,
    debugWarn,
    debugWarnEnd,
    debugError,
    debugErrorEnd
} from './debug-log.js'

export class KokoroPlayer {
    /**
     * @param {string} containerId - ID of the DOM container for chunk list
     * @param {function(string): void} statusCallback - Called with status strings
     * @param {function(string): void} activeDeviceCallback - Called with active device string
     * @param {function(boolean): void} [uiStateCallback] - Called with isSpeaking state
     * @param {function(number, number): void} [scrollCallback] - Called with text offset and length for scrolling the source textarea
     */
    constructor(containerId, statusCallback, activeDeviceCallback, uiStateCallback, scrollCallback, onPlayOverCallback) {
        this.containerId = containerId;
        this.statusCallback = statusCallback;
        this.activeDeviceCallback = activeDeviceCallback;
        this.uiStateCallback = uiStateCallback;
        this.scrollCallback = scrollCallback;
        this.onPlayOverCallback = onPlayOverCallback;

        // Initialize reactive store
        this.audioCardStore = AudioCardStore.getInstance();
        
        // Subscribe to reactive values
        const unsubscribeChunks = this.audioCardStore.chunks.subscribe((newChunks) => {
            this._syncChunksToUI(newChunks);
        });
        
        const unsubscribeIsSpeaking = this.audioCardStore.isSpeaking.subscribe((isSpeaking) => {
            this._syncIsSpeakingToUI(isSpeaking);
        });
        
        this._unsubscribeHandlers = {
            chunks: unsubscribeChunks,
            isSpeaking: unsubscribeIsSpeaking
        };

        // Player state
        this.chunks = [];            // { text, audio: Blob }
        this.currentChunkIndex = -1;
        this.status = 'ready';       // 'loading' | 'ready' | 'generating' | 'error'
        this.isSpeaking = false;
        this.mergedBlob = null;
        this.voices = null;
        this.mergedBlob = null;
        this.voices = null;
        
        // Kokoro backend device (WebGPU or WASM)
        this.activeDevice = null;
        
        // Mobile browser detection - autoplay policies are much stricter on mobile
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            || (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);

        // Initialize sub-modules
        this.workerComm = new WorkerCommunication(this);
        this.audioPlayer = new AudioPlayer(this);
        this.chunkManager = new ChunkManager(this);
        this.chunkRenderer = new ChunkRenderer(this);
    }

    _getContainer() {
        return document.getElementById(this.containerId);
    }

    _getCard(index) {
        const container = this._getContainer();
        if (!container) return null;
        return container.querySelector(`[data-chunk="${index}"]`) || container.querySelector(`[data-index="${index}"]`);
    }

    _getAudioElement(index) {
        const container = this._getContainer();
        return container ? container.querySelector(`audio[data-chunk="${index}"]`) : null;
    }

    // ─── Public API ──────────────────────────────────────────────────

    setActiveDevice(newActiveDevice) {
        this.activeDevice = newActiveDevice;
        this.activeDeviceCallback(newActiveDevice);
    }

    /**
     * Start TTS playback. If the model isn't ready, initializes it first.
     */
    async play(textToSpeak, voice, speed) {
        // Reset state
        this.chunks = [];
        this.currentChunkIndex = -1;
        this.mergedBlob = null;
        this._setStatusState(`generating`, `Generating audio...`);
        this._setUIState(true);
        this.renderChunks();

        await this.workerComm.initializeWorker();

        if (!this.workerComm.workerReady) {
            this._setStatusState('loading', 'Model still loading...');
            setTimeout(() => {
                this._setStatusState('ready', 'Ready.')
            }, 3000);
            this._setStatusState('ready', 'Ready.');
            this._setUIState(false);
            return;
        }

        // Send text to worker
        this.workerComm.worker.postMessage({ text: textToSpeak, voice, speed });
    }

    /** Stop all playback and reset state. */
    stop() {
        this.audioPlayer.stopAll();

        // Clear playing state from all cards
        const container = this._getContainer();
        if (container) {
            container.querySelectorAll('[data-chunk].playing').forEach(card => {
                card.classList.remove('playing');
            });
        }

        //this.chunks = [];
        this.currentChunkIndex = -1;
        this.mergedBlob = null;
        this.status = 'ready';
        this._setUIState(false);
        this.renderChunks();

        // Reset reactive store state
        this.audioCardStore.setCurrentChunkIndex(-1);
        this.audioCardStore.setIsSpeaking(false);
        this.audioCardStore.setChunkPlayingStates(new Map());
        this.audioCardStore.setCardPlayingStates(new Map());
    }

    /** Download the merged audio Blob. */
    downloadMerged() {
        if (!this.mergedBlob) return;
        const url = URL.createObjectURL(this.mergedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'audio.wav';
        a.click();
        URL.revokeObjectURL(url);
    }

    /** Destroy the player and clean up resources. */
    destroy() {
        this.audioPlayer.cleanup();
        this.workerComm.destroy();

        // Unsubscribe from reactive store
        if (this._unsubscribeHandlers) {
            this._unsubscribeHandlers.chunks();
            this._unsubscribeHandlers.isSpeaking();
            if (this._unsubscribeHandlers.chunkPlaying) {
                this._unsubscribeHandlers.chunkPlaying.forEach(unsub => unsub());
            }
        }
    }

    /**
     * Get the active Kokoro backend device indicator string.
     * @returns {string} The device indicator (e.g., " (WebGPU)" or " (WASM)") or empty string if not available.
     */
    getActiveDevice() {
        return this.activeDevice ? this.activeDevice.toUpperCase() : '';
    }

    // ─── Rendering ───────────────────────────────────────────────────

    renderChunks() {
        this.chunkRenderer.renderChunks();
    }

    /**
     * Append a single chunk card incrementally (for streaming)
     * @param {object} chunk - Chunk data with text and audio
     * @param {number} index - Chunk index
     */
    _appendChunkCard(chunk, index) {
        const container = this._getContainer();
        if (!container || !this.isSpeaking)
        {
            this._setStatusState('ready', "Ready.")
            return;
        }

        const card = this.chunkRenderer.createChunkCard(chunk, index, (event, cardIndex) => {
            // @param {function(event: string, card index: integer): void} eventCallback - Callback for audio events
            // event: play, pause, ended, waiting, playing
            const card = container.children[index];
            if (event == 'playing')
            {
                card.classList.add('playing');
                card.classList.add('active');
            }
            else if (event == 'ended')
            {
                card.classList.remove('playing');
                const isLastCard = index == (container.children.length - 1);
                if (!isLastCard)
                {
                    const nextCardIndex = index + 1;
                    this._playChunk(nextCardIndex);
                    //debugLog(`kokoro-player.audioEventCallback(): Play next chunk: ${nextCardIndex}`);
                }
            }
            //debugLog(`kokoro-player.audioEventCallback(): PLAY: event=${event}: index=${index}, cardIndex=${cardIndex}: card.id=${card.id}`);
        });
        container.appendChild(card);

        // Update store with chunk data
        this.audioCardStore.addChunk(chunk);
        
        // Subscribe to this chunk's playing state
        const unsubscribeChunkPlaying = this.audioCardStore.getChunkPlaying(index).subscribe((playing) => {
            this._setCardPlaying(index, playing);
        });
        
        // Add to unsubscribe handlers
        if (!this._unsubscribeHandlers.chunkPlaying) {
            this._unsubscribeHandlers.chunkPlaying = new Map();
        }
        this._unsubscribeHandlers.chunkPlaying.set(index, unsubscribeChunkPlaying);
    }

    /**
     * Start playback from a specific chunk (used during streaming generation)
     * Uses the same robust logic as _playChunk to handle muted audio and autoplay.
     * @param {number} chunkIndex - Index of the chunk to start from
     */
    _startChunkPlayback(chunkIndex) {
        const audioEl = this._getAudioElement(chunkIndex);
        if (!audioEl) return;
        audioEl.currentTime = 0;

        // Mark card as playing immediately (same as _playChunk)
        this._setCardPlaying(chunkIndex, true);

        const playWhenReady = () => {
            audioEl.muted = false;
            audioEl.removeEventListener('canplaythrough', playWhenReady);
            audioEl.removeEventListener('canplay', playWhenReady);
            audioEl.play().then(() => {
                // Success - audio is now playing
            }).catch((err) => {
                console.warn('play() failed:', err.name, err.message);
                if (err.name === 'NotAllowedError') {
                    this._handleAutoplayBlocked(audioEl, chunkIndex);
                } else {
                    setTimeout(() => audioEl.play().catch(() => {}), 100);
                }
            });
        };

        audioEl.addEventListener('canplay', playWhenReady, { once: true });
        audioEl.addEventListener('canplaythrough', playWhenReady, { once: true });

        // Timeout fallback for mobile browsers
        setTimeout(() => {
            if (audioEl.muted) {
                audioEl.muted = false;
                audioEl.removeEventListener('canplay', playWhenReady);
                audioEl.removeEventListener('canplaythrough', playWhenReady);
            }
        }, 3000);
    }

    // ─── Scroll Helpers ──────────────────────────────────────────────

    /**
     * Scroll the container so the specified chunk card is visible in the viewport.
     * Uses a proportional scroll position based on the chunk's index relative to
     * the total number of chunks, falling back to scrollIntoView if that fails.
     * @param {number} index - Chunk index to scroll to
     */
    _scrollToChunk(index) {
        const container = this._getContainer();
        if (!container) return;

        const totalChunks = this.chunks.length;
        if (totalChunks === 0) return;

        // Calculate proportional scroll position (0.0 to 1.0)
        const ratio = index / (totalChunks - 1 || 1);

        // Target element for scrolling
        const targetCard = container.querySelector(`[data-chunk="${index}"]`);

        if (targetCard) {
            // Try scrollIntoView first (smooth, browser-optimized)
            targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            // Fallback: set scroll position proportionally
            const maxScroll = container.scrollHeight - container.clientHeight;
            container.scrollTop = Math.round(maxScroll * ratio);
        }
    }

    /**
     * Scroll the source-editor textarea to selection so the text region at the given offset
     * and length is visible in the viewport.
     * Uses proportional scroll position based on the character offset relative
     * to the total text length, with smooth scrolling behavior.
     * @param {number} offset - Character offset of the text region
     * @param {number} length - Length of the text region
     */    
    scrollToSelection(textarea) {
        const selectionStart = textarea.selectionStart;
        const style = window.getComputedStyle(textarea);

        // 1. Create a mirror div
        const mirror = document.createElement('div');
        const textareaStyles = [
            'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing',
            'textTransform', 'wordSpacing', 'textIndent', 'whiteSpace', 'wordBreak',
            'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom',
            'borderLeftWidth', 'borderRightWidth', 'lineHeight', 'width'
        ];

        // 2. Copy textarea styles to the mirror
        textareaStyles.forEach(prop => {
            mirror.style[prop] = style[prop];
        });

        // Critical styling for accuracy
        mirror.style.position = 'absolute';
        mirror.style.visibility = 'hidden';
        mirror.style.whiteSpace = 'pre-wrap';
        mirror.style.wordWrap = 'break-word';
        mirror.style.overflowY = 'scroll'; // Match textarea scrollbar width

        // 3. Fill mirror with text up to selection and add a marker
        const textBefore = textarea.value.substring(0, selectionStart);
        mirror.textContent = textBefore;
        
        const marker = document.createElement('span');
        marker.textContent = textarea.value.substring(selectionStart, selectionStart + 1) || '.';
        mirror.appendChild(marker);

        // 4. Calculate position and scroll
        document.body.appendChild(mirror);
        const markerTop = marker.offsetTop;
        const textareaHeight = textarea.clientHeight;
        
        // Center the selection vertically in the textarea
        textarea.scrollTop = markerTop - (textareaHeight / 2);

        // Clean up
        document.body.removeChild(mirror);
    }

    // ─── Playback Helpers ────────────────────────────────────────────

    _playChunk(index) {
        const audioEl = this._getAudioElement(index);
        if (!audioEl) return;
        audioEl.currentTime = 0;

        // Scroll the playing card into view
        this._scrollToChunk(index);

        // Mark card as playing immediately when playback is initiated
        // (the 'play' event doesn't fire reliably on muted audio elements)
        this._setCardPlaying(index, true);
        this._setUIState(true);

        const playWhenReady = () => {
            audioEl.muted = false;
            audioEl.removeEventListener('canplaythrough', playWhenReady);
            audioEl.removeEventListener('canplay', playWhenReady);
            audioEl.play().then(() => {
                // Success - audio is now playing
            }).catch((err) => {
                console.warn('play() failed:', err.name, err.message);
                if (err.name === 'NotAllowedError') {
                    this._handleAutoplayBlocked(audioEl, index);
                } else {
                    setTimeout(() => audioEl.play().catch(() => {}), 100);
                }
            });
        };

        audioEl.addEventListener('canplay', playWhenReady, { once: true });
        audioEl.addEventListener('canplaythrough', playWhenReady, { once: true });

        // Timeout fallback for mobile browsers
        setTimeout(() => {
            if (audioEl.muted) {
                audioEl.muted = false;
                audioEl.removeEventListener('canplay', playWhenReady);
                audioEl.removeEventListener('canplaythrough', playWhenReady);
                audioEl.play().catch((err) => {
                    if (err.name === 'NotAllowedError') {
                        this._handleAutoplayBlocked(audioEl, index);
                    }
                });
            }
        }, 2000);
    }

    _handleAutoplayBlocked(audioEl, index) {
        console.warn('Autoplay was blocked. User interaction required.');
        const card = this._getCard(index);
        if (!card) return;

        const indicator = document.createElement('div');
        indicator.className = 'text-xs text-orange-600 dark:text-orange-400 mt-1';
        indicator.textContent = 'Tap the play button to start audio';
        card.appendChild(indicator);

        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 5000);
    }

    // ─── Internal Callbacks ──────────────────────────────────────────

    _onChunkPlay(index) {
        //debugLog(`onChunkPlay(): index=${index}`);
        // Called when a chunk starts playing (via play event or fallback)
        // Always update the playing state to ensure highlighting works
        this._setCardPlaying(index, true);
        this._setUIState(true);
    }

    _onChunkEnded(index) {
        //debugLog(`onChunkEnded(): index=${index}: isSpeaking=${this.isSpeaking}`);
        this._setCardPlaying(index, false);
        const nextIdx = index + 1;
        if ((nextIdx < this.chunks.length) && this.isSpeaking) {
            this._setCardActive(index, false);
            this._setCardActive(nextIdx, true);
            this.currentChunkIndex = nextIdx;
            
            if (this.isMobile) {
                const nextCard = this._getCard(nextIdx);
                if (nextCard) {
                    const existing = nextCard.querySelector('.mobile-play-indicator');
                    if (existing) existing.remove();
                    
                    const indicator = document.createElement('div');
                    indicator.className = 'mobile-play-indicator text-xs text-blue-600 dark:text-blue-400 mt-2 text-center';
                    indicator.textContent = '▶ Tap to play';
                    nextCard.appendChild(indicator);
                    
                    setTimeout(() => {
                        if (indicator.parentNode) indicator.remove();
                    }, 5000);
                }
            } else {
                setTimeout(() => this._playChunk(nextIdx), 300);
            }
        } else if (this.status === 'generating') {
            this.currentChunkIndex = this.chunks.length;
            this._setCardActive(index, false);
        } else {
            this._setCardActive(index, false);
            this.currentChunkIndex = -1;
            this._setUIState(false);

            this.onPlayOverCallback();
        }
    }

    // ─── Status Helpers ──────────────────────────────────────────────

    _setStatusState(newStatus, statusMsg)
    {
        if (this.status != newStatus)
        {
            this.status = newStatus;
            this._setStatusMsg(statusMsg);
            this.statusCallback(statusMsg);
        }
    }

    _setStatusMsg(message) {
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }

    _setError(error) {
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.textContent = `Error: ${error}`;
            statusEl.classList.add('error');
        }
    }

    _setCardActive(index, active) {
        const card = this._getCard(index);
        if (card) {
            card.classList.toggle('active', active);
        }
    }

    /**
     * Set the playing state on a chunk card to visually indicate active playback.
     * @param {number} index - Chunk index
     * @param {boolean} playing - Whether the card is currently playing
     */
    _setCardPlaying(index, playing) {
        const card = this._getCard(index);
        if (!card) {
            console.error(`_setCardPlaying(): card not found for index=${index}!`);
            return;
        }
        card.classList.toggle('playing', playing);
    }

    /**
     * Check if a chunk card is currently playing
     * @param {number} index - Chunk index
     * @returns {boolean}
     */
    _isCardPlaying(index) {
        const card = this._getCard(index);
        return card ? card.classList.contains('playing') : false;
    }

    /**
     * Sync chunks from store to DOM
     */
    _syncChunksToUI(chunks) {
        const container = this._getContainer();
        if (!container) return;

        // Clear existing cards
        container.innerHTML = '';

        // Render all chunks
        chunks.forEach((chunk, index) => {
            this._appendChunkCard(chunk, index);
        });

        // Reset playback state
        this.currentChunkIndex = -1;
        this.isSpeaking = false;
        this.mergedBlob = null;
        this.audioCardStore.setCurrentChunkIndex(-1);
        this.audioCardStore.setIsSpeaking(false);
    }

    /**
     * Sync speaking state to UI
     */
    _syncIsSpeakingToUI(isSpeaking) {
        if (isSpeaking) {
            this.status = 'ready';
            this._setStatusState('ready', 'Ready.');
        } else {
            this._setStatusState('ready', 'Ready.');
        }
    }

    _getUIState()
    {
        return this.isSpeaking;
    }

    _setUIState(isSpeaking) {
        if (this.isSpeaking != isSpeaking)
        {
            this.isSpeaking = isSpeaking;
            //debugLog(`_setUIState(): isSpeaking=${isSpeaking}`);
            if (this.uiStateCallback) {
                this.uiStateCallback(isSpeaking);
            }
        }
    }

    _updatePlayButton(index, isPlaying)
    {
        this.uiStateCallback(isPlaying);
    }
}
