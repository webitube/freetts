/**
 * WorkerCommunication handles all Web Worker communication for Kokoro TTS.
 *
 * Manages the lifecycle of the Kokoro Web Worker: initialization, WebGPU
 * detection, message routing, and cleanup. The worker runs `kokoro-js` with
 * ONNX Runtime to generate speech audio from text.
 *
 * Message protocol:
 * - **To worker:** `{ status: 'init', useWebGPU: boolean }` or `{ text, voice, speed }`
 * - **From worker:** `device`, `ready`, `stream`, `complete`, `error`
 *
 * @example
 * ```ts
 * const comm = new WorkerCommunication(kokoroPlayer);
 * await comm.initializeWorker();
 * comm.sendText('Hello world', 'af_heart', 1.0);
 * ```
 */

import {
    debugLog,
    debugLogEnd,
    debugWarn,
    debugWarnEnd,
    debugError,
    debugErrorEnd,
} from './debug-log';

/**
 * Manages Web Worker lifecycle and message routing for Kokoro TTS.
 */
export class WorkerCommunication {
    private player: any;

    /** The active Worker instance (null if not yet created or destroyed). */
    worker: Worker | null = null;

    /** Whether the worker has finished initialization and is ready to process requests. */
    workerReady: boolean = false;

    /** Whether the worker is currently being initialized (prevents duplicate init). */
    workerInitializing: boolean = false;

    /**
     * Create a new WorkerCommunication bound to a KokoroPlayer instance.
     * @param player - The parent KokoroPlayer instance.
     */
    constructor(player: any) {
        this.player = player;
    }

    /**
     * Detect WebGPU availability on the current browser.
     * @returns True if WebGPU is available and an adapter can be requested.
     */
    async detectWebGPU(): Promise<boolean> {
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
     * Initialize the Kokoro Web Worker.
     * Detects WebGPU support, creates the worker, and waits for the 'ready' message.
     * Idempotent: calling multiple times while initializing will await the same result.
     *
     * @throws Error if the worker is destroyed during initialization.
     */
    async initializeWorker(): Promise<void> {
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
        this.player._setStatusState('loading', 'Loading...');

        this.worker = new Worker(new URL('./tts-worker.js', import.meta.url), { type: 'module' });
        this.worker.onmessage = this._handleWorkerMessage.bind(this);
        this.worker.onerror = (e: ErrorEvent) => {
            console.error('Worker error:', e);
            this.player._setStatusState('error', 'Error');
            this.player._setError(e.message);
        };

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
     * Handle incoming messages from the Kokoro Web Worker.
     * Routes messages to the appropriate player methods based on status type.
     *
     * @param e - The MessageEvent from the worker.
     */
    _handleWorkerMessage(e: MessageEvent): void {
        const { status, chunk, mergedAudio, voices, device, data } = e.data;

        switch (status) {
            case 'device':
                this.player.setActiveDevice(device);
                break;
            case 'ready':
                this.workerReady = true;
                this.workerInitializing = false;
                this.player.voices = voices;
                setTimeout(() => this.player.statusCallback('Ready.'), 3000);
                break;
            case 'stream':
                this.player.chunks.push(chunk);
                this.player._appendChunkCard(chunk, this.player.chunks.length - 1);
                this.player.statusCallback(`Generating audio... (${this.player.chunks.length} chunk(s))`);
                if (this.player.status === 'generating' && this.player.currentChunkIndex < 0 && this.player.chunks.length === 1) {
                    this.player.currentChunkIndex = 0;
                    this.player._setCardActive(0, true);
                    this.player._startChunkPlayback(0);
                }
                if (this.player.status === 'generating' && this.player.currentChunkIndex === this.player.chunks.length - 1 && this.player.chunks.length > 1) {
                    this.player._setCardActive(this.player.currentChunkIndex, true);
                    this.player._startChunkPlayback(this.player.currentChunkIndex);
                }
                break;
            case 'complete':
                this.player.status = 'ready';
                this.player.mergedBlob = mergedAudio;
                this.player.statusCallback(`Done. ${this.player.chunks.length} chunk(s).`);
                if (this.player.currentChunkIndex < 0 || this.player.currentChunkIndex >= this.player.chunks.length) {
                    this.player.currentChunkIndex = -1;
                    this.player._setUIState(false);
                }
                break;
            case 'error':
                this.player._setStatusState('error', 'Error');
                this.player._setError(data);
                break;
        }
    }

    /**
     * Send text to the worker for TTS generation.
     * @param text - The text to synthesize.
     * @param voice - The voice identifier (e.g., `'af_heart'`).
     * @param speed - The playback speed multiplier.
     */
    sendText(text: string, voice: string, speed: number): void {
        if (this.worker && this.workerReady) {
            this.worker.postMessage({ text, voice, speed });
        }
    }

    /**
     * Destroy the worker: terminate the process and reset all state.
     */
    destroy(): void {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.workerReady = false;
        this.workerInitializing = false;
    }
}
