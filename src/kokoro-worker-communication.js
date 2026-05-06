/**
 * WorkerCommunication handles all Web Worker communication for Kokoro TTS
 * including initialization, message handling, and error management.
 */

import {
    debugLog,
    debugLogEnd,
    debugWarn,
    debugWarnEnd,
    debugError,
    debugErrorEnd
} from './debug-log.js'



/**
 * WorkerCommunication manages Web Worker communication for Kokoro TTS
 */
export class WorkerCommunication {
    /**
     * @param {KokoroPlayer} player - Reference to KokoroPlayer instance
     */
    constructor(player) {
        this.player = player;
        this.worker = null;
        this.workerReady = false;
        this.workerInitializing = false;
    }

    /**
     * Detect WebGPU on the main thread (not available inside a Web Worker)
     * @returns {Promise<boolean>} Whether WebGPU is available
     */
    async detectWebGPU() {
        debugLog(`webgpu=${navigator.gpu}`);
        if (!navigator.gpu) return false;
        try {
            const adapter = await navigator.gpu.requestAdapter();
            return !!adapter;
        } catch {
            return false;
        }
    }

    /**
     * Initialize the Web Worker
     * @returns {Promise<void>}
     */
    async initializeWorker() {
        if (this.worker) return Promise.resolve();
        if (this.workerInitializing) {
            return new Promise((resolve, reject) => {
                const check = () => {
                    if (this.workerReady) resolve();
                    else if (!this.worker) reject(new Error('Worker destroyed'));
                    else setTimeout(check, 100);
                };
                check();
            });
        }

        this.workerInitializing = true;
        this.player._setStatus('loading');

        this.worker = new Worker(new URL('./tts-worker.js', import.meta.url), { type: 'module' });
        this.worker.onmessage = this._handleWorkerMessage.bind(this);
        this.worker.onerror = (e) => {
            console.error('Worker error:', e);
            this.player._setStatus('error');
            this.player._setError(e.message);
        };

        // Detect WebGPU on the main thread and pass it to the worker.
        // navigator.gpu is NOT available inside a Web Worker, so we must
        // detect here and tell the worker which backend to use.
        const useWebGPU = await this.detectWebGPU();
        this.worker.postMessage({ status: 'init', useWebGPU });

        return new Promise((resolve, reject) => {
            const check = () => {
                if (this.workerReady) resolve();
                else if (!this.worker) reject(new Error('Worker destroyed'));
                else setTimeout(check, 100);
            };
            check();
        });
    }

    /**
     * Handle messages from tts-worker.js
     * @param {MessageEvent} e - Worker message event
     */
    _handleWorkerMessage(e) {
        const { status, chunk, mergedAudio, voices, device, data } = e.data;

        switch (status) {
            case 'device':
                this.player.statusCallback(`Kokoro TTS: using ${device.toUpperCase()}`);
                break;
            case 'ready':
                this.workerReady = true;
                this.workerInitializing = false;
                this.player.voices = voices;
                this.player.statusCallback('Kokoro TTS ready.');
                setTimeout(() => this.player.statusCallback(''), 3000);
                break;
            case 'stream':
                this.player.chunks.push(chunk);
                this.player._appendChunkCard(chunk, this.player.chunks.length - 1);
                this.player.statusCallback(`Generating audio... (${this.player.chunks.length} chunk(s))`);
                // Start playback from the first chunk if nothing is playing yet
                if (this.player.status === 'generating' && this.player.currentChunkIndex < 0 && this.player.chunks.length === 1) {
                    this.player.currentChunkIndex = 0;
                    this.player._setCardActive(0, true);
                    this.player._startChunkPlayback(0);
                }
                // Resume playback if we were waiting for more chunks
                if (this.player.status === 'generating' && this.player.currentChunkIndex === this.player.chunks.length - 1 && this.player.chunks.length > 1) {
                    this.player._setCardActive(this.player.currentChunkIndex, true);
                    this.player._startChunkPlayback(this.player.currentChunkIndex);
                }
                break;
            case 'complete':
                this.player.status = 'ready';
                this.player.mergedBlob = mergedAudio;
                this.player.statusCallback(`Done. ${this.player.chunks.length} chunk(s).`);
                // Reset UI if playback finished / was waiting before complete arrived
                if (this.player.currentChunkIndex < 0 || this.player.currentChunkIndex >= this.player.chunks.length) {
                    this.player.currentChunkIndex = -1;
                    this.player._setUIState(false);
                }
                break;
            case 'error':
                this.player.status = 'error';
                this.player._setError(data);
                break;
        }
    }

    /**
     * Send text to the worker for TTS generation
     * @param {string} text - Text to convert to speech
     * @param {string} voice - Voice ID to use
     * @param {number} speed - Speech speed
     */
    sendText(text, voice, speed) {
        if (this.worker && this.workerReady) {
            this.worker.postMessage({ text, voice, speed });
        }
    }

    /**
     * Destroy the worker
     */
    destroy() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
            this.workerReady = false;
            this.workerInitializing = false;
        }
    }
}
