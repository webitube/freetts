/**
 * ChunkRenderer handles DOM rendering for chunk cards.
 */

import { debugLog, debugWarn, debugError } from "./debug-log";

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
    createAudioElement(chunk, index, eventCallback) {
        const audioEl = document.createElement('audio');
        audioEl.id = `audio-chunk-${index}`;
        audioEl.setAttribute('data-chunk', index);
        audioEl.src = URL.createObjectURL(chunk.audio);
        //debugLog(`kokoro-chunk-renderer.createAudioElement(): id=${audioEl.id}: Created audio element for chunk ${index} with blob URL ${audioEl.src}`);

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
            //debugLog(`kokoro-chunk-renderer.createAudioElement(): event='play': id=${audioEl.id}: Audio element for chunk ${index} to get ready to start playing`);
            this.player._onChunkPlay(index);
            // Update play button to pause icon
            this.player._updatePlayButton(index, true);
            eventCallback && eventCallback('play', index);
        });
        audioEl.addEventListener('pause', () => {
            //debugLog(`kokoro-chunk-renderer.createAudioElement(): event='pause': id=${audioEl.id}: Audio element for chunk ${index} paused`);
            // Update play button to play icon
            this.player._updatePlayButton(index, false);
            eventCallback && eventCallback('pause', index);
        });
        audioEl.addEventListener('ended', () => {
            //debugLog(`kokoro-chunk-renderer.createAudioElement(): event='ended': id=${audioEl.id}: Audio element for chunk ${index} ended`);
            this.player._onChunkEnded(index);
            eventCallback && eventCallback('ended', index);
        });
        audioEl.addEventListener('waiting', () => {
            // Show pause icon when audio is waiting to play
            //debugLog(`kokoro-chunk-renderer.createAudioElement(): event='waiting': id=${audioEl.id}: Audio element for chunk ${index} is waiting`);
            this.player._updatePlayButton(index, true);
            eventCallback && eventCallback('waiting', index);
        });
        audioEl.addEventListener('playing', () => {
            // Show pause icon when audio starts playing
            //debugLog(`kokoro-chunk-renderer.createAudioElement(): event='playing': id=${audioEl.id}: Audio element for chunk ${index} is now playing...`);
            this.player._updatePlayButton(index, true);
            eventCallback && eventCallback('playing', index);
        });
        
        // Fallback: use playbackstatechange to detect when audio starts playing
        // This ensures _onChunkPlay() is called even for muted audio elements
        audioEl.addEventListener('playbackstatechange', () => {
            //debugLog(`kokoro-chunk-renderer.createAudioElement(): id=${audioEl.id}: Audio element for chunk ${index} playback state changed to ${audioEl.playbackState}`);
            if (audioEl.playbackState === 2) { // PLAYING
                if (!this.player._isCardPlaying(index)) {
                    this.player._onChunkPlay(index);
                }
            } else if (audioEl.playbackState === 1) { // PAUSED
                this.player._updatePlayButton(index, false);
            } else if (audioEl.playbackState === 3) { // STOPPED
                this.player._updatePlayButton(index, false);
            }
        });

        return audioEl;
    }
}
