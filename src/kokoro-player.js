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
        
        // Mobile browser detection - autoplay policies are much stricter on mobile
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            || (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
    }

    // ─── Worker Management ───────────────────────────────────────────

    /** Detect WebGPU on the main thread (not available inside a Web Worker). */
    async _detectWebGPU() {
        //console.log(`_detectWebGPU(): navigator.gpu=${navigator.gpu}, navigator.useWebGPU=${navigator.useWebGPU}`);
        if (!navigator.gpu) return false;
        try {
            const adapter = await navigator.gpu.requestAdapter();
            return !!adapter;
        } catch {
            return false;
        }
    }

    /** Ensure the worker is initialized, return a promise that resolves when ready. */
    async _ensureWorker() {
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

        // Detect WebGPU on the main thread and pass it to the worker.
        // navigator.gpu is NOT available inside a Web Worker, so we must
        // detect here and tell the worker which backend to use.
        const useWebGPU = await this._detectWebGPU();
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
                // Append incrementally without destroying existing audio elements
                this._appendChunkCard(chunk, this.chunks.length - 1);
                this.statusCallback(`Generating audio... (${this.chunks.length} chunk(s))`);
            // Start playback from the first chunk if nothing is playing yet
                if (this.status === 'generating' && this.currentChunkIndex < 0 && this.chunks.length === 1) {
                    this.currentChunkIndex = 0;
                    this._setCardActive(0, true);
                    
                    if (!this.isMobile) {
                        // On desktop, auto-play immediately
                        setTimeout(() => this._playChunk(0), 100);
                    } else {
                        // On mobile, show "Tap to play" indicator instead
                        const container = document.getElementById(this.containerId);
                        if (container) {
                            const card = container.querySelector(`[data-chunk="0"]`);
                            if (card) {
                                const indicator = document.createElement('div');
                                indicator.className = 'mobile-play-indicator text-xs text-blue-600 dark:text-blue-400 mt-2 text-center';
                                indicator.textContent = '▶ Tap to play';
                                card.appendChild(indicator);
                                setTimeout(() => { if (indicator.parentNode) indicator.remove(); }, 5000);
                            }
                        }
                    }
                }
                // Resume playback if we were waiting for more chunks
                if (this.status === 'generating' && this.currentChunkIndex === this.chunks.length - 1 && this.chunks.length > 1) {
                    this._setCardActive(this.currentChunkIndex, true);
                    
                    if (!this.isMobile) {
                        // On desktop, auto-play with delay
                        setTimeout(() => this._playChunk(this.currentChunkIndex), 100);
                    } else {
                        // On mobile, show "Tap to play" indicator
                        const container = document.getElementById(this.containerId);
                        if (container) {
                            const card = container.querySelector(`[data-chunk="${this.currentChunkIndex}"]`);
                            if (card) {
                                const indicator = document.createElement('div');
                                indicator.className = 'mobile-play-indicator text-xs text-blue-600 dark:text-blue-400 mt-2 text-center';
                                indicator.textContent = '▶ Tap to play';
                                card.appendChild(indicator);
                                setTimeout(() => { if (indicator.parentNode) indicator.remove(); }, 5000);
                            }
                        }
                    }
                }
                break;
            case 'complete':
                this.status = 'ready';
                this.mergedBlob = mergedAudio;
                this.statusCallback(`Done. ${this.chunks.length} chunk(s).`);
                // Reset UI if playback finished / was waiting before complete arrived
                if (this.currentChunkIndex < 0 || this.currentChunkIndex >= this.chunks.length) {
                    this.currentChunkIndex = -1;
                    this._setUIState(false);
                }
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
        this.currentChunkIndex = -1;  // nothing playing yet
        this.mergedBlob = null;
        this.status = 'generating';
        this._setStatus(`Generating audio...`);
        this._setUIState(true);
        this.renderChunks();

        //console.log(`play(): navigator.gpu=${navigator.gpu}, navigator.useWebGPU=${navigator.useWebGPU}`);
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
        card.className = `tts-card transition-all cursor-pointer ${
            isActive
                ? 'border border-blue-200 dark:border-blue-800'
                : 'border border-transparent hover:bg-blue-50 dark:hover:bg-slate-700'
        }`;
        card.setAttribute('data-chunk', index);

        // Click to seek
        card.onclick = () => {
            // Pause all audio then play the clicked chunk
            const container = document.getElementById(this.containerId);
            if (container) {
                container.querySelectorAll('audio').forEach(a => a.pause());
            }
            this._setCardActive(this.currentChunkIndex, false);
            this.currentChunkIndex = index;
            this._setCardActive(index, true);
            this._playChunk(index);
        };

        // Text label
        const textEl = document.createElement('p');
        textEl.className = 'text-xs mb-1';
        textEl.textContent = chunk.text;

        // Audio controls
        const audioEl = document.createElement('audio');
        audioEl.setAttribute('data-chunk', index);
        audioEl.src = URL.createObjectURL(chunk.audio);
        audioEl.controls = true;
        audioEl.playsInline = true;
        audioEl.preload = 'auto';
        audioEl.muted = true;
        audioEl.className = 'w-full mt-0.5';

        // Auto-play is handled by _playChunk

        // Event hooks for auto-advance
        audioEl.addEventListener('play', () => {
            this._onChunkPlay(index);
        });
          audioEl.addEventListener('ended', () => {
            const nextIdx = index + 1;
            if (nextIdx < this.chunks.length) {
                // Next chunk is available — advance to it
                this._setCardActive(index, false);
                this._setCardActive(nextIdx, true);
                this.currentChunkIndex = nextIdx;
                
                if (this.isMobile) {
                    // On mobile, don't auto-play due to strict autoplay policies
                    // Show a visual indicator that the user should tap the play button
                    const container = document.getElementById(this.containerId);
                    if (container) {
                        const nextCard = container.querySelector(`[data-chunk="${nextIdx}"]`);
                        if (nextCard) {
                            // Remove any existing indicator
                            const existing = nextCard.querySelector('.mobile-play-indicator');
                            if (existing) existing.remove();
                            
                            const indicator = document.createElement('div');
                            indicator.className = 'mobile-play-indicator text-xs text-blue-600 dark:text-blue-400 mt-2 text-center';
                            indicator.textContent = '▶ Tap to play';
                            nextCard.appendChild(indicator);
                            
                            // Remove after 5 seconds
                            setTimeout(() => {
                                if (indicator.parentNode) indicator.remove();
                            }, 5000);
                        }
                    }
                } else {
                    // On desktop, auto-advance with delay
                    setTimeout(() => this._playChunk(nextIdx), 300);
                }
            } else if (this.status === 'generating') {
                // No more chunks yet — mark as waiting so stream handler resumes
                this.currentChunkIndex = this.chunks.length; // sentinel: "waiting for more"
                this._setCardActive(index, false);
            } else {
                // Last chunk finished and generation complete
                this._setCardActive(index, false);
                this.currentChunkIndex = -1;
                this._setUIState(false);
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

        // Mobile browser audio playback requires careful handling:
        // 1. Start muted to work around autoplay policies
        // 2. Unmute when audio is ready to play
        // 3. Use timeout fallback in case events don't fire reliably on mobile
        // 4. Handle autoplay blocked errors gracefully
        const playWhenReady = () => {
            audioEl.muted = false;
            audioEl.removeEventListener('canplaythrough', playWhenReady);
            audioEl.removeEventListener('canplay', playWhenReady);
            audioEl.play().then(() => {
                // Success - audio is now playing
            }).catch((err) => {
                console.warn('play() failed:', err.name, err.message);
                // Check if this is an autoplay blocked error
                if (err.name === 'NotAllowedError') {
                    this._handleAutoplayBlocked(audioEl, index);
                } else {
                    // Retry after a short delay for other errors
                    setTimeout(() => audioEl.play().catch(() => {}), 100);
                }
            });
        };

        // Listen for both events - canplay fires earlier and is more reliable on mobile
        audioEl.addEventListener('canplay', playWhenReady, { once: true });
        audioEl.addEventListener('canplaythrough', playWhenReady, { once: true });

        // Timeout fallback: try to play after 2 seconds even if events haven't fired
        // This handles cases where mobile browsers don't fire ready events properly
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

    /**
     * Handle autoplay blocked errors by showing a user-friendly message
     * and providing a way for the user to manually start playback.
     */
    _handleAutoplayBlocked(audioEl, index) {
        console.log('Autoplay was blocked. User interaction required.');
        const container = document.getElementById(this.containerId);
        if (!container) return;
        const card = container.querySelector(`[data-chunk="${index}"]`);
        if (!card) return;

        // Add a visual indicator that autoplay was blocked
        const indicator = document.createElement('div');
        indicator.className = 'text-xs text-orange-600 dark:text-orange-400 mt-1';
        indicator.textContent = 'Tap the play button to start audio';
        card.appendChild(indicator);

        // Remove the indicator after 5 seconds
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 5000);
    }

    // ─── Incremental DOM Helpers ────────────────────────────────────

    /** Append a single chunk card without destroying existing audio elements. */
    _appendChunkCard(chunk, index) {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        container.classList.remove('hidden');
        const card = this._createChunkCard(chunk, index);
        container.appendChild(card);
        if (index === this.currentChunkIndex) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    /** Toggle active/inactive styling on a chunk card by index. */
    _setCardActive(index, isActive) {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        const card = container.querySelector(`[data-chunk="${index}"]`);
        if (!card) return;
        card.className = `p-3 rounded-lg transition-all cursor-pointer ${
            isActive
                ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                : 'bg-gray-50 dark:bg-slate-800 border border-transparent hover:bg-blue-50 dark:hover:bg-slate-700'
        }`;
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
