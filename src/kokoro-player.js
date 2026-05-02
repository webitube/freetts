/**
 * KokoroPlayer — chunk-based TTS player for Kokoro TTS.
 *
 * Each audio chunk is rendered as an independent <audio> element.
 * Users can click any chunk to seek into it. Chunks auto-play in sequence.
 *
 * Communicates with tts-worker.js via postMessage.
 * All DOM updates go through the containerId + statusCallback.
 */
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

        // Worker
        this.worker = null;
        this.workerReady = false;
        this.workerInitializing = false;
        this.voices = null;

        // Player state
        this.chunks = [];            // { text, audio: Blob }
        this.currentChunkIndex = -1;
        this.status = 'ready';       // 'loading' | 'ready' | 'generating' | 'error'
        this.mergedBlob = null;
    }

    // ─── Worker Management ───────────────────────────────────────────

    /** Ensure the worker is initialized, return a promise that resolves when ready. */
    _ensureWorker() {
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
        this._setStatus('loading');

        this.worker = new Worker(new URL('./tts-worker.js', import.meta.url), { type: 'module' });
        this.worker.onmessage = this._handleWorkerMessage.bind(this);
        this.worker.onerror = (e) => {
            console.error('Worker error:', e);
            this._setStatus('error');
            this._setError(e.message);
        };
        // Worker auto-initializes on import (top-level await in main())

        return new Promise((resolve, reject) => {
            const check = () => {
                if (this.workerReady) resolve();
                else if (!this.worker) reject(new Error('Worker destroyed'));
                else setTimeout(check, 100);
            };
            check();
        });
    }

    /** Handle messages from tts-worker.js */
    _handleWorkerMessage(e) {
        const { status, chunk, mergedAudio, voices, device, data } = e.data;

        switch (status) {
            case 'device':
                this.statusCallback(`Kokoro TTS: using ${device.toUpperCase()}`);
                break;
            case 'ready':
                this.workerReady = true;
                this.workerInitializing = false;
                this.voices = voices;
                this.statusCallback('Kokoro TTS ready.');
                setTimeout(() => this.statusCallback(''), 3000);
                break;
            case 'stream':
                this.chunks.push(chunk);
                this.renderChunks();
                // Auto-play if we're at the end and playing
                if (this.currentChunkIndex === this.chunks.length - 2) {
                    this.currentChunkIndex = this.chunks.length - 1;
                    this.renderChunks();
                    this._playChunk(this.currentChunkIndex);
                }
                break;
            case 'complete':
                this.status = 'ready';
                this.mergedBlob = mergedAudio;
                this.statusCallback(`Done. ${this.chunks.length} chunk(s).`);
                break;
            case 'error':
                this.status = 'error';
                this._setError(data);
                break;
        }
    }

    // ─── Public API ──────────────────────────────────────────────────

    /**
     * Start TTS playback. If the model isn't ready, initializes it first.
     */
    async play(textToSpeak, voice, speed) {
        // Reset state
        this.chunks = [];
        this.currentChunkIndex = 0;
        this.mergedBlob = null;
        this.status = 'generating';
        this._setStatus(`Generating audio...`);
        this._setUIState(true);
        this.renderChunks();

        await this._ensureWorker();

        if (!this.workerReady) {
            this._setStatus('Model still loading...');
            setTimeout(() => this._setStatus('Ready.'), 3000);
            this.status = 'ready';
            this._setUIState(false);
            return;
        }

        // Send text to worker
        this.worker.postMessage({ text: textToSpeak, voice, speed });
    }

    /** Stop all playback and reset state. */
    stop() {
        // Pause all audio elements
        const container = document.getElementById(this.containerId);
        if (container) {
            container.querySelectorAll('audio').forEach(audio => {
                audio.pause();
                audio.currentTime = 0;
            });
        }

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

    // ─── Rendering ───────────────────────────────────────────────────

    renderChunks() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Update status text
        if (this.status === 'generating') {
            this.statusCallback(`Generating audio... (${this.chunks.length} chunk(s))`);
        }

        // Clear and rebuild
        container.innerHTML = '';

        if (this.chunks.length === 0 && this.status !== 'generating') {
            container.classList.add('hidden');
            return;
        }

        container.classList.remove('hidden');

        this.chunks.forEach((chunk, i) => {
            const card = this._createChunkCard(chunk, i);
            container.appendChild(card);
        });

        // Scroll to current chunk
        if (this.currentChunkIndex >= 0 && this.currentChunkIndex < this.chunks.length) {
            const currentCard = container.children[this.currentChunkIndex];
            if (currentCard) {
                currentCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    _createChunkCard(chunk, index) {
        const card = document.createElement('div');
        const isActive = index === this.currentChunkIndex;
        card.className = `p-3 rounded-lg transition-all cursor-pointer ${
            isActive
                ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                : 'bg-gray-50 dark:bg-slate-800 border border-transparent hover:bg-blue-50 dark:hover:bg-slate-700'
        }`;
        card.setAttribute('data-chunk', index);

        // Click to seek
        card.onclick = () => {
            this.currentChunkIndex = index;
            this.renderChunks();
            this._playChunk(index);
        };

        // Text label
        const textEl = document.createElement('p');
        textEl.className = 'text-sm mb-2';
        textEl.textContent = chunk.text;

        // Audio controls
        const audioEl = document.createElement('audio');
        audioEl.setAttribute('data-chunk', index);
        audioEl.src = URL.createObjectURL(chunk.audio);
        audioEl.controls = true;
        audioEl.className = 'w-full mt-1';

        // Auto-play is handled by _playChunk

        // Event hooks for auto-advance
        audioEl.addEventListener('play', () => {
            this._onChunkPlay(index);
        });
        audioEl.addEventListener('ended', () => {
            if (this.status !== 'generating' && this.currentChunkIndex === this.chunks.length - 1) {
                // Last chunk finished
                this.currentChunkIndex = -1;
                this._setUIState(false);
                this.renderChunks();
            } else if (this.chunks.length > 0) {
                // Advance to next chunk
                this.currentChunkIndex = index + 1;
                this.renderChunks();
                if (this.currentChunkIndex < this.chunks.length) {
                    this._playChunk(this.currentChunkIndex);
                    this._onChunkPlay(this.currentChunkIndex);
                }
            }
        });

        card.appendChild(textEl);
        card.appendChild(audioEl);

        return card;
    }

    // ─── Playback Helpers ────────────────────────────────────────────

    _playChunk(index) {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        const audioEl = container.querySelector(`audio[data-chunk="${index}"]`);
        if (!audioEl) return;
        audioEl.currentTime = 0;
        audioEl.play().catch(() => {});
    }

    // ─── Chunk Highlighting Hook ─────────────────────────────────────

    /**
     * Called when a chunk starts playing. Override this externally
     * to update editor highlighting for the current chunk text.
     * @param {number} index - The chunk index that started playing
     */
    _onChunkPlay(index) {}

    // ─── State Helpers ───────────────────────────────────────────────

    _setStatus(msg) {
        this.statusCallback(msg);
    }

    _setError(msg) {
        this.statusCallback(`Kokoro TTS error: ${msg}`);
    }

    _setUIState(active) {
        if (this.uiStateCallback) this.uiStateCallback(active);
    }
}
