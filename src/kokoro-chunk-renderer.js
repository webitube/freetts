/**
 * ChunkRenderer handles DOM rendering for chunk cards.
 */

import { debugLog } from "./debug-log";
import { AudioCardStore } from "./audio-card-store.js";
import { AudioCardActions } from "./audio-card-actions.js";

/**
 * ChunkRenderer manages chunk card DOM creation and manipulation
 */
export class ChunkRenderer {
    /**
     * @param {KokoroPlayer} player - Reference to KokoroPlayer instance
     */
    constructor(player) {
        this.player = player;
        
        // Initialize reactive store and actions
        this.audioCardStore = AudioCardStore.getInstance();
        this.audioCardActions = this.audioCardStore.actions;
    }

    _getContainer() {
        return document.getElementById(this.player.containerId);
    }

    _resetPlaybackState(container) {
        if (!container) return;
        container.querySelectorAll('audio').forEach(a => a.pause());
        container.querySelectorAll('[data-chunk].playing').forEach(c => c.classList.remove('playing'));
    }

    _bindAudioEventHandlers(audioEl, index, eventCallback) {
        if (typeof audioEl.addEventListener !== 'function') {
            return;
        }

        audioEl.addEventListener('play', () => {
            this.player._onChunkPlay(index);
            this.player._updatePlayButton(index, true);
            eventCallback?.('play', index);
        });
        audioEl.addEventListener('pause', () => {
            this.player._updatePlayButton(index, false);
            eventCallback?.('pause', index);
        });
        audioEl.addEventListener('ended', () => {
            this.player._onChunkEnded(index);
            eventCallback?.('ended', index);
        });
        audioEl.addEventListener('waiting', () => {
            this.player._updatePlayButton(index, true);
            eventCallback?.('waiting', index);
        });
        audioEl.addEventListener('playing', () => {
            this.player._updatePlayButton(index, true);
            eventCallback?.('playing', index);
        });
        audioEl.addEventListener('playbackstatechange', () => {
            if (audioEl.playbackState === 2) {
                if (!this.player._isCardPlaying(index)) {
                    this.player._onChunkPlay(index);
                }
            } else if (audioEl.playbackState === 1 || audioEl.playbackState === 3) {
                this.player._updatePlayButton(index, false);
            }
        });
    }

    /**
     * Render all chunks in the container
     */
    renderChunks() {
        const container = this._getContainer();
        if (!container) return;

        // Update status text
        if (this.player.status === 'generating') {
            this.player.statusCallback(`Generating audio... (${this.player.chunks.length} chunk(s))`);
        }

        // Clear and rebuild
        container.innerHTML = '';

        if (this.player.chunks.length === 0 && this.player.status !== 'generating') {
            container.classList.add('hidden');
            return;
        }

        container.classList.remove('hidden');

        this.player.chunks.forEach((chunk, i) => {
            const card = this.createChunkCard(chunk, i, this.audioElementCallback);
            container.appendChild(card);
        });

        // Scroll to current chunk
        if (this.player.currentChunkIndex >= 0 && this.player.currentChunkIndex < this.player.chunks.length) {
            const currentCard = container.children[this.player.currentChunkIndex];
            if (currentCard) {
                currentCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    audioElementCallback(event, index) {
        debugLog(`kokoro-chunk-renderer.audioElementCallback(): event=${event}: index=${index}`);
        // Update reactive store for fine-grained UI updates
        if (event === 'play' || event === 'playing') {
            this.audioCardActions.setCardPlaying(index, true);
            this.audioCardActions.setCardActive(index, true);
        } else if (event === 'pause') {
            this.audioCardActions.setCardPlaying(index, false);
        } else if (event === 'ended') {
            this.audioCardActions.setCardPlaying(index, false);
        }
    }

    /**
     * Create a chunk card DOM element
     * @param {object} chunk - Chunk data with text
     * @param {number} index - Chunk index
     * @param {function(event: string, card index: integer): void} eventCallback - Callback for audio events
     * @returns {HTMLElement} The card element
     */
    createChunkCard(chunk, index, audioElementCallback) {
        const card = document.createElement('div');
        const isActive = index === this.player.currentChunkIndex;
        card.className = `tts-card transition-all cursor-pointer ${
            isActive
                ? 'border border-blue-200 dark:border-blue-800'
                : 'border border-transparent hover:bg-blue-100 dark:hover:bg-blue-900'
        }`;
        card.setAttribute('data-chunk', index);

        // Click to seek - use reactive actions
        card.onclick = () => {
            const container = this._getContainer();
            this._resetPlaybackState(container);
            this.audioCardActions.setCardActive(this.player.currentChunkIndex, false);
            this.player.currentChunkIndex = index;
            this.audioCardActions.setCardActive(index, true);
            this.player._playChunk(index);
        };

        // Text label
        const textEl = document.createElement('p');
        textEl.className = 'text-xs mb-1';
        textEl.textContent = chunk.text;

        // Audio controls
        const audioEl = this.createAudioElement(chunk, index, audioElementCallback);

        card.appendChild(textEl);
        card.appendChild(audioEl);
        card.id = `card-${index}`;

        return card;
    }

    /**
     * Create an audio element for a chunk
     * @param {object} chunk - Chunk data with audio blob
     * @param {number} index - Chunk index
     * @param {function(event: string, card index: integer): void} eventCallback - Callback for audio events
     * @returns {HTMLAudioElement}
     */
    createAudioElement(chunk, index, audioElementCallback) {
        const audioEl = document.createElement('audio');
        audioEl.id = `audio-chunk-${index}`;
        audioEl.setAttribute('data-chunk', index);
        audioEl.src = URL.createObjectURL(chunk.audio);
        //debugLog(`kokoro-chunk-renderer.createAudioElement(): id=${audioEl.id}: Created audio element for chunk ${index} with blob URL ${audioEl.src}`);

        // Register with AudioPlayer so playChunk() can find it
        this.player.audioPlayer.registerAudioElement(index, audioEl);

        audioEl.controls = true;
        audioEl.playsInline = true;
        audioEl.preload = 'auto';
        audioEl.muted = true;
        audioEl.className = 'w-full mt-0.5';

        // Use reactive event callback that updates the store
        this._bindAudioEventHandlers(audioEl, index, (event, cardIndex) => {
            if (event === 'play' || event === 'playing') {
                this.audioCardActions.setCardPlaying(cardIndex, true);
                this.audioCardActions.setCardActive(cardIndex, true);
            } else if (event === 'pause') {
                this.audioCardActions.setCardPlaying(cardIndex, false);
            } else if (event === 'ended') {
                this.audioCardActions.setCardPlaying(cardIndex, false);
            }
        });

        return audioEl;
    }
}
