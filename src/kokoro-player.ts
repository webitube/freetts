/**
 * KokoroPlayer — chunk-based TTS player for Kokoro TTS.
 *
 * Orchestrates chunk-based audio playback for the Kokoro neural TTS engine.
 * Delegates to sub-modules for worker communication, audio playback, chunk
 * state management, and DOM rendering. Handles mobile autoplay policy
 * compliance (muted start + tap-to-play indicators).
 *
 * Sub-modules:
 * - `kokoro-worker-communication.ts` — Worker lifecycle and message routing
 * - `kokoro-audio-player.ts` — Audio element lifecycle and playback
 * - `kokoro-chunk-manager.ts` — Chunk state delegation
 * - `kokoro-chunk-renderer.ts` — Chunk card DOM rendering
 *
 * @example
 * ```ts
 * const player = new KokoroPlayer('chunk-container', statusCb, deviceCb);
 * await player.play('Hello world', 'af_heart', 1.0);
 * player.stop();
 * player.downloadMerged();
 * ```
 */
import { WorkerCommunication } from './kokoro-worker-communication';
import { AudioPlayer } from './kokoro-audio-player';
import { ChunkManager } from './kokoro-chunk-manager';
import { ChunkRenderer } from './kokoro-chunk-renderer';

import {
    debugLog,
    debugLogEnd,
    debugWarn,
    debugWarnEnd,
    debugError,
    debugErrorEnd,
} from './debug-log';

import { AppStore, StatusEnum } from './app-store';

/**
 * Chunk-based audio playback orchestrator for Kokoro TTS.
 */
export class KokoroPlayer {
    /** ID of the DOM container element for chunk cards. */
    containerId: string;

    /** Callback invoked with status messages. */
    statusCallback: (msg: string) => void;

    /** Callback invoked when the active device changes. */
    activeDeviceCallback: (device: string) => void;

    /** Optional callback invoked when the UI speaking state changes. */
    uiStateCallback?: (active: boolean) => void;

    /** Optional callback for scroll synchronization. */
    scrollCallback?: (offset: number, length: number) => void;

    /** Optional callback invoked when all playback is complete. */
    onPlayOverCallback?: () => void;

    // Player state

    /** Array of generated audio chunks. */
    chunks: any[] = [];

    /** Index of the currently playing chunk. */
    currentChunkIndex: number = -1;

    /** Current player status (`'ready'`, `'generating'`, `'error'`). */
    status: string = 'ready';

    /** Whether the player is currently speaking. */
    isSpeaking: boolean = false;

    /** Whether the player has been explicitly stopped (prevents worker messages from restarting playback). Note: This is distinct from AppStore.isStopped */
    isStopped: boolean = false;

    /** Merged WAV Blob of all chunks (for download). */
    mergedBlob: Blob | null = null;

    /** Available Kokoro voices (populated after worker init). */
    voices: any = null;

    /** Active device backend (`'webgpu'` or `'wasm'`). */
    activeDevice: string | null = null;

    /** Whether the current browser is a mobile browser. */
    isMobile: boolean;

    /** Sub-module: Web Worker communication. */
    workerComm: WorkerCommunication;

    /** Sub-module: Audio element lifecycle. */
    audioPlayer: AudioPlayer;

    /** Sub-module: Chunk state delegation. */
    chunkManager: ChunkManager;

    /** Sub-module: Chunk card DOM rendering. */
    chunkRenderer: ChunkRenderer;

    _onChunkPlay?: (index: number) => void;

    /**
     * Creates a new KokoroPlayer instance.
     *
     * @param containerId - ID of the DOM container for chunk cards.
     * @param statusCallback - Callback invoked with status messages.
     * @param activeDeviceCallback - Callback invoked when the active device changes.
     * @param uiStateCallback - Optional callback for UI speaking state changes.
     * @param scrollCallback - Optional callback for scroll synchronization.
     * @param onPlayOverCallback - Optional callback invoked when all playback is complete.
     */
    constructor(
        containerId: string,
        statusCallback: (msg: string) => void,
        activeDeviceCallback: (device: string) => void,
        uiStateCallback?: (active: boolean) => void,
        scrollCallback?: (offset: number, length: number) => void,
        onPlayOverCallback?: () => void,
    ) {
        this.containerId = containerId;
        this.statusCallback = statusCallback;
        this.activeDeviceCallback = activeDeviceCallback;
        this.uiStateCallback = uiStateCallback;
        this.scrollCallback = scrollCallback;
        this.onPlayOverCallback = onPlayOverCallback;

        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            || (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);

        this.workerComm = new WorkerCommunication(this);
        this.audioPlayer = new AudioPlayer(this);
        this.chunkManager = new ChunkManager(this);
        this.chunkRenderer = new ChunkRenderer(this);
    }

    /**
     * Get the DOM container element for chunk cards.
     * @returns The container HTMLElement, or null if not found.
     */
    _getContainer(): HTMLElement | null {
        return document.getElementById(this.containerId);
    }

    /**
     * Get the chunk card element at the given index.
     * @param index - The chunk index to look up.
     * @returns The card HTMLElement, or null if not found.
     */
    _getCard(index: number): HTMLElement | null {
        const container = this._getContainer();
        if (!container) return null;
        return container.querySelector(`[data-chunk="${index}"]`) || container.querySelector(`[data-index="${index}"]`);
    }

    /**
     * Get the audio element for a specific chunk.
     * @param index - The chunk index.
     * @returns The HTMLAudioElement, or null if not found.
     */
    _getAudioElement(index: number): HTMLAudioElement | null {
        const container = this._getContainer();
        return container ? container.querySelector(`audio[data-chunk="${index}"]`) : null;
    }

    /**
     * Set the active Kokoro device backend and notify all subscribers.
     * @param newActiveDevice - The device backend (`'webgpu'` or `'wasm'`).
     */
    setActiveDevice(newActiveDevice: string): void {
        this.activeDevice = newActiveDevice;
        AppStore.instance.activeDevice.set(newActiveDevice);
        this.activeDeviceCallback(newActiveDevice);
    }

    /**
     * Start TTS playback for the given text using Kokoro.
     * Resets state, initializes the worker, and sends the synthesis request.
     * @param textToSpeak - The text to synthesize.
     * @param voice - The voice identifier (e.g., `'af_heart'`).
     * @param speed - The playback speed multiplier.
     */
    async play(textToSpeak: string, voice: string, speed: number): Promise<void> {
        this.isStopped = false;     // Note: This is the Kokoro Player's 'isStopped' and *not* AppStore.isStopped
        this.chunks = [];
        this.currentChunkIndex = -1;
        this.mergedBlob = null;
        this._setStatusState('generating', 'Generating audio...');
        this._setUIState(true);
        this.renderChunks();

        await this.workerComm.initializeWorker();

        if (!this.workerComm.workerReady) {
            this._setStatusState('loading', 'Model still loading...');
            setTimeout(() => {
                this._setStatusState('ready', 'Ready.');
            }, 3000);
            this._setStatusState('ready', 'Ready.');
            this._setUIState(false);
            return;
        }

        this.workerComm.worker.postMessage({ text: textToSpeak, voice, speed });
    }

    /**
     * Stop all playback: pause audio, clear playing indicators, terminate worker, and reset state.
     * Does NOT clear chunks so the viewport remains intact.
     */
    stop(): void {
        this.isStopped = true;      // Note: This is the Kokoro Player's 'isStopped' and *not* AppStore.isStopped
        this.audioPlayer.stopAll();

        // Terminate the worker to stop background generation
        this.workerComm.destroy();

        const container = this._getContainer();
        if (container) {
            container.querySelectorAll('[data-chunk].playing').forEach(card => {
                card.classList.remove('playing');
            });
        }

        this.currentChunkIndex = -1;
        this.status = 'ready';
        this._setUIState(false);
    }

    /**
     * Trigger a download of the merged WAV audio blob.
     * Does nothing if no merged blob is available.
     */
    downloadMerged(): void {
        if (!this.mergedBlob) return;
        const url = URL.createObjectURL(this.mergedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'audio.wav';
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Destroy the player: clean up audio elements and terminate the worker.
     */
    destroy(): void {
        this.audioPlayer.cleanup();
        this.workerComm.destroy();
    }

    /**
     * Get the active device backend as an uppercase string.
     * @returns The device string (e.g., `'WEBGPU'`), or empty string if not set.
     */
    getActiveDevice(): string {
        return this.activeDevice ? this.activeDevice.toUpperCase() : '';
    }

    /**
     * Render all chunk cards by delegating to the ChunkRenderer.
     */
    renderChunks(): void {
        this.chunkRenderer.renderChunks();
    }

    /**
     * Append a new chunk card to the container.
     * Binds event handlers for playing and ended events, and auto-advances to the next chunk.
     * @param chunk - The chunk data (text + audio Blob).
     * @param index - The chunk index.
     */
    _appendChunkCard(chunk: any, index: number): void {
        const container = this._getContainer();
        if (!container || !this.isSpeaking) {
            this._setStatusState('ready', 'Ready.');
            return;
        }

        const card = this.chunkRenderer.createChunkCard(chunk, index, (event: string, cardIndex: number) => {
            const card = container.children[index] as HTMLElement;
            if (event === 'playing') {
                card.classList.add('playing');
                card.classList.add('active');
            } else if (event === 'ended') {
                card.classList.remove('playing');
                const isLastCard = index === container.children.length - 1;
                if (!isLastCard) {
                    const nextCardIndex = index + 1;
                    this._playChunk(nextCardIndex);
                }
            }
        });
        container.appendChild(card);
    }

    /**
     * Start playback of a specific chunk.
     * Waits for the audio to be ready, unmutes, and handles autoplay blocking.
     * @param chunkIndex - The chunk index to play.
     */
    _startChunkPlayback(chunkIndex: number): void {
        const audioEl = this._getAudioElement(chunkIndex);
        if (!audioEl) return;
        audioEl.currentTime = 0;

        this._setCardPlaying(chunkIndex, true);

        const playWhenReady = () => {
            audioEl.muted = false;
            audioEl.removeEventListener('canplaythrough', playWhenReady);
            audioEl.removeEventListener('canplay', playWhenReady);
            audioEl.play().then(() => {
                // Success
            }).catch((err: any) => {
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

        setTimeout(() => {
            if (audioEl.muted) {
                audioEl.muted = false;
                audioEl.removeEventListener('canplay', playWhenReady);
                audioEl.removeEventListener('canplaythrough', playWhenReady);
            }
        }, 3000);
    }

    /**
     * Scroll the chunk container to bring the target chunk into view.
     * Uses proportional scrolling if the card element is not yet rendered.
     * @param index - The chunk index to scroll to.
     */
    _scrollToChunk(index: number): void {
        const container = this._getContainer();
        if (!container) return;

        const totalChunks = this.chunks.length;
        if (totalChunks === 0) return;

        const targetCard = container.querySelector(`[data-chunk="${index}"]`);

        if (targetCard) {
            (targetCard as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            const maxScroll = container.scrollHeight - container.clientHeight;
            const ratio = index / (totalChunks - 1 || 1);
            container.scrollTop = Math.round(maxScroll * ratio);
        }
    }

    /**
     * Scroll the textarea to keep the current selection visible.
     * Uses a mirror div technique to calculate the correct scroll position.
     * @param textarea - The HTMLTextAreaElement to scroll.
     */
    scrollToSelection(textarea: HTMLTextAreaElement): void {
        const selectionStart = textarea.selectionStart;
        const style = window.getComputedStyle(textarea);

        const mirror = document.createElement('div');
        const textareaStyles: (keyof CSSStyleDeclaration)[] = [
            'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing',
            'textTransform', 'wordSpacing', 'textIndent', 'whiteSpace', 'wordBreak',
            'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom',
            'borderLeftWidth', 'borderRightWidth', 'lineHeight', 'width',
        ];

        textareaStyles.forEach(prop => {
            mirror.style[prop] = style[prop];
        });

        mirror.style.position = 'absolute';
        mirror.style.visibility = 'hidden';
        mirror.style.whiteSpace = 'pre-wrap';
        mirror.style.wordWrap = 'break-word';
        mirror.style.overflowY = 'scroll';

        const textBefore = textarea.value.substring(0, selectionStart);
        mirror.textContent = textBefore;

        const marker = document.createElement('span');
        marker.textContent = textarea.value.substring(selectionStart, selectionStart + 1) || '.';
        mirror.appendChild(marker);

        document.body.appendChild(mirror);
        const markerTop = marker.offsetTop;
        const textareaHeight = textarea.clientHeight;

        textarea.scrollTop = markerTop - (textareaHeight / 2);

        document.body.removeChild(mirror);
    }

    /**
     * Play a specific chunk by index.
     * Scrolls to the chunk, sets playing state, and handles autoplay blocking.
     * @param index - The chunk index to play.
     */
    _playChunk(index: number): void {
        const audioEl = this._getAudioElement(index);
        if (!audioEl) return;
        audioEl.currentTime = 0;

        this._scrollToChunk(index);
        this._setCardPlaying(index, true);
        this._setUIState(true);

        const playWhenReady = () => {
            audioEl.muted = false;
            audioEl.removeEventListener('canplaythrough', playWhenReady);
            audioEl.removeEventListener('canplay', playWhenReady);
            audioEl.play().then(() => {
                // Success
            }).catch((err: any) => {
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

        setTimeout(() => {
            if (audioEl.muted) {
                audioEl.muted = false;
                audioEl.removeEventListener('canplay', playWhenReady);
                audioEl.removeEventListener('canplaythrough', playWhenReady);
                audioEl.play().catch((err: any) => {
                    if (err.name === 'NotAllowedError') {
                        this._handleAutoplayBlocked(audioEl, index);
                    }
                });
            }
        }, 2000);
    }

    /**
     * Handle autoplay policy blocking by showing a tap-to-play indicator.
     * The indicator auto-removes after 5 seconds.
     * @param audioEl - The blocked HTMLAudioElement.
     * @param index - The chunk index.
     */
    _handleAutoplayBlocked(audioEl: HTMLAudioElement, index: number): void {
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

    /**
     * Handle the play event for a chunk.
     * Sets the card as playing and updates the UI state.
     * @param index - The chunk index that started playing.
     */
    _onChunkPlay(index: number): void {
        this._setCardPlaying(index, true);
        this._setUIState(true);
    }

    /**
     * Handle the ended event for a chunk.
     * Advances to the next chunk or stops playback if all chunks are done.
     * On mobile, shows a "Tap to play" indicator instead of auto-advancing.
     * @param index - The chunk index that ended.
     */
    _onChunkEnded(index: number): void {
        this._setCardPlaying(index, false);
        const nextIdx = index + 1;
        if (nextIdx < this.chunks.length && this.isSpeaking) {
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

            this.onPlayOverCallback?.();
        }
    }

    /**
     * Update the player status and display message if the status has changed.
     * @param newStatus - The new status string.
     * @param statusMsg - The message to display.
     */
    _setStatusState(newStatus: string, statusMsg: string): void {
        if (this.status !== newStatus) {
            this.status = newStatus;
            this._setStatusMsg(statusMsg);
            this.statusCallback(statusMsg);
        }
    }

    /**
     * Update the status message element in the DOM.
     * @param message - The message to display.
     */
    _setStatusMsg(message: string): void {
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }

    /**
     * Display an error message in the status element.
     * @param error - The error message to display.
     */
    _setError(error: string): void {
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.textContent = `Error: ${error}`;
            statusEl.classList.add('error');
        }
    }

    /**
     * Toggle the active state of a chunk card.
     * @param index - The chunk index.
     * @param active - Whether the card should be marked as active.
     */
    _setCardActive(index: number, active: boolean): void {
        const card = this._getCard(index);
        if (card) {
            card.classList.toggle('active', active);
        }
    }

    /**
     * Toggle the playing state of a chunk card.
     * @param index - The chunk index.
     * @param playing - Whether the card should be marked as playing.
     */
    _setCardPlaying(index: number, playing: boolean): void {
        const card = this._getCard(index);
        if (!card) {
            console.error(`_setCardPlaying(): card not found for index=${index}!`);
            return;
        }
        card.classList.toggle('playing', playing);
    }

    /**
     * Check if a chunk card is currently marked as playing.
     * @param index - The chunk index.
     * @returns True if the card has the 'playing' class.
     */
    _isCardPlaying(index: number): boolean {
        const card = this._getCard(index);
        return card ? card.classList.contains('playing') : false;
    }

    /**
     * Get the current UI speaking state.
     * @returns True if the player is currently speaking.
     */
    _getUIState(): boolean {
        return this.isSpeaking;
    }

    /**
     * Update the UI speaking state and notify the callback if changed.
     * @param isSpeaking - The new speaking state.
     */
    _setUIState(isSpeaking: boolean): void {
        if (this.isSpeaking !== isSpeaking) {
            this.isSpeaking = isSpeaking;
            if (this.uiStateCallback) {
                this.uiStateCallback(isSpeaking);
            }
        }
    }

    /**
     * Update the play button state via the UI state callback.
     * @param _index - The chunk index (unused).
     * @param isPlaying - Whether the audio is currently playing.
     */
    _updatePlayButton(_index: number, isPlaying: boolean): void {
        this.uiStateCallback?.(isPlaying);
    }
}
