/**
 * ChunkRenderer handles DOM rendering for chunk cards.
 */

import { debugWarn } from "./debug-log";

/**
 * ChunkRenderer manages chunk card DOM creation and manipulation
 */
export class ChunkRenderer {
    /**
     * @param {KokoroPlayer} player - Reference to KokoroPlayer instance
     */
    constructor(player) {
        this.player = player;
    }

    /**
     * Render all chunks in the container
     */
    renderChunks() {
        const container = document.getElementById(this.player.containerId);
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
            const card = this.createChunkCard(chunk, i);
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

    /**
     * Create a chunk card DOM element
     * @param {object} chunk - Chunk data with text
     * @param {number} index - Chunk index
     * @returns {HTMLElement} The card element
     */
    createChunkCard(chunk, index) {
        const card = document.createElement('div');
        const isActive = index === this.player.currentChunkIndex;
        card.className = `tts-card transition-all cursor-pointer ${
            isActive
                ? 'border border-blue-200 dark:border-blue-800'
                : 'border border-transparent hover:bg-blue-100 dark:hover:bg-blue-900'
        }`;
        card.setAttribute('data-chunk', index);

        // Click to seek
        card.onclick = () => {
            const container = document.getElementById(this.player.containerId);
            if (container) {
                container.querySelectorAll('audio').forEach(a => a.pause());
                // Clear playing state from all cards before starting new playback
                container.querySelectorAll('[data-chunk].playing').forEach(c => {
                    c.classList.remove('playing');
                });
            }
            this.player._setCardActive(this.player.currentChunkIndex, false);
            this.player.currentChunkIndex = index;
            this.player._setCardActive(index, true);
            this.player._playChunk(index);
        };

        // Text label
        const textEl = document.createElement('p');
        textEl.className = 'text-xs mb-1';
        textEl.textContent = chunk.text;

        // Audio controls
        const audioEl = this.createAudioElement(chunk, index);

        card.appendChild(textEl);
        card.appendChild(audioEl);

        return card;
    }

    /**
     * Create an audio element for a chunk
     * @param {object} chunk - Chunk data with audio blob
     * @param {number} index - Chunk index
     * @returns {HTMLAudioElement}
     */
    createAudioElement(chunk, index) {
        const audioEl = document.createElement('audio');
        audioEl.setAttribute('data-chunk', index);
        audioEl.src = URL.createObjectURL(chunk.audio);

        // Register with AudioPlayer so playChunk() can find it
        this.player.audioPlayer.registerAudioElement(index, audioEl);

        // Update status when chunk ends
        audioEl.addEventListener('ended', () => {
            this.player._onChunkEnded(index);
        });
        audioEl.controls = true;
        audioEl.playsInline = true;
        audioEl.preload = 'auto';
        audioEl.muted = true;
        audioEl.className = 'w-full mt-0.5';

        // Event hooks for auto-advance
        audioEl.addEventListener('play', () => {
            this.player._onChunkPlay(index);
        });
        audioEl.addEventListener('ended', () => {
            this.player._onChunkEnded(index);
        });

        return audioEl;
    }
}
