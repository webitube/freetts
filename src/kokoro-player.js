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
 * - kokoro-ui-manager.js - DOM manipulation
 * - kokoro-chunk-manager.js - Chunk state logic
 */
import { WorkerCommunication } from './kokoro-worker-communication.js';
import { AudioPlayer } from './kokoro-audio-player.js';
import { UIManager } from './kokoro-ui-manager.js';
import { ChunkManager } from './kokoro-chunk-manager.js';
import { ChunkRenderer } from './kokoro-chunk-renderer.js';

export class KokoroPlayer {
    /**
     * @param {string} containerId - ID of the DOM container for chunk list
     * @param {function(string): void} statusCallback - Called with status strings
     * @param {function(boolean): void} [uiStateCallback] - Called with isSpeaking state
     */
    constructor(containerId, statusCallback, uiStateCallback) {
        this.containerId = containerId;
        this.statusCallback = statusCallback;
        this.uiStateCallback = uiStateCallback;

        // Player state
        this.chunks = [];            // { text, audio: Blob }
        this.currentChunkIndex = -1;
        this.status = 'ready';       // 'loading' | 'ready' | 'generating' | 'error'
        this.mergedBlob = null;
        this.voices = null;
        
        // Mobile browser detection - autoplay policies are much stricter on mobile
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            || (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);

        // Initialize sub-modules
        this.workerComm = new WorkerCommunication(this);
        this.audioPlayer = new AudioPlayer(this);
        this.uiManager = new UIManager(this);
        this.chunkManager = new ChunkManager(this);
        this.chunkRenderer = new ChunkRenderer(this);
    }

    // ─── Public API ──────────────────────────────────────────────────

    /**
     * Start TTS playback. If the model isn't ready, initializes it first.
     */
    async play(textToSpeak, voice, speed) {
        // Reset state
        this.chunks = [];
        this.currentChunkIndex = -1;
        this.mergedBlob = null;
        this.status = 'generating';
        this._setStatus(`Generating audio...`);
        this._setUIState(true);
        this.renderChunks();

        await this.workerComm.initializeWorker();

        if (!this.workerComm.workerReady) {
            this._setStatus('Model still loading...');
            setTimeout(() => this._setStatus('Ready.'), 3000);
            this.status = 'ready';
            this._setUIState(false);
            return;
        }

        // Send text to worker
        this.workerComm.worker.postMessage({ text: textToSpeak, voice, speed });
    }

    /** Stop all playback and reset state. */
    stop() {
        this.audioPlayer.stopAll();

        this.chunks = [];
        this.currentChunkIndex = -1;
        this.mergedBlob = null;
        this.status = 'ready';
        this._setUIState(false);
        this.renderChunks();
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
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const card = this.chunkRenderer.createChunkCard(chunk, index);
        container.appendChild(card);
    }

    /**
     * Start playback from a specific chunk (used during streaming generation)
     * Uses the same robust logic as _playChunk to handle muted audio and autoplay.
     * @param {number} chunkIndex - Index of the chunk to start from
     */
    _startChunkPlayback(chunkIndex) {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        const audioEl = container.querySelector(`audio[data-chunk="${chunkIndex}"]`);
        if (!audioEl) return;
        audioEl.currentTime = 0;

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

    // ─── Playback Helpers ────────────────────────────────────────────

    _playChunk(index) {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        const audioEl = container.querySelector(`audio[data-chunk="${index}"]`);
        if (!audioEl) return;
        audioEl.currentTime = 0;

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
        console.log('Autoplay was blocked. User interaction required.');
        const container = document.getElementById(this.containerId);
        if (!container) return;
        const card = container.querySelector(`[data-chunk="${index}"]`);
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
        // Called when a chunk starts playing
    }

    _onChunkEnded(index) {
        const nextIdx = index + 1;
        if (nextIdx < this.chunks.length) {
            this._setCardActive(index, false);
            this._setCardActive(nextIdx, true);
            this.currentChunkIndex = nextIdx;
            
            if (this.isMobile) {
                const container = document.getElementById(this.containerId);
                if (container) {
                    const nextCard = container.querySelector(`[data-chunk="${nextIdx}"]`);
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
        }
    }

    // ─── Status Helpers ──────────────────────────────────────────────

    _setStatus(message) {
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.textContent = message;
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
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const card = container.querySelector(`[data-index="${index}"]`) || 
                     container.querySelector(`[data-chunk="${index}"]`);
        if (card) {
            card.classList.toggle('active', active);
        }
    }

    _setUIState(isSpeaking) {
        if (this.uiStateCallback) {
            this.uiStateCallback(isSpeaking);
        }
    }
}
