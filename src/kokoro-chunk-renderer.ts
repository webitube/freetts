/**
 * ChunkRenderer handles DOM rendering for Kokoro TTS chunk cards.
 *
 * Creates and manages the visual chunk cards displayed during Kokoro playback,
 * including text labels, audio elements, event bindings, and seek-by-click
 * functionality. Each card represents one audio chunk with its corresponding text.
 *
 * @example
 * ```ts
 * const renderer = new ChunkRenderer(kokoroPlayer);
 * renderer.renderChunks();
 * ```
 */

import { debugLog } from './debug-log';

/**
 * Renders chunk cards into the DOM container for Kokoro TTS playback.
 */
export class ChunkRenderer {
    private player: any;

    /**
     * Create a new ChunkRenderer bound to a KokoroPlayer instance.
     * @param player - The parent KokoroPlayer instance.
     */
    constructor(player: any) {
        this.player = player;
    }

    /**
     * Get the chunk container element by ID.
     * @returns The container HTMLElement, or null if not found.
     */
    _getContainer(): HTMLElement | null {
        return document.getElementById(this.player.containerId);
    }

    /**
     * Reset playback state: pause all audio and remove playing indicators.
     * @param container - The container element to reset (may be null).
     */
    _resetPlaybackState(container: HTMLElement | null): void {
        if (!container) return;
        container.querySelectorAll('audio').forEach((a: HTMLAudioElement) => a.pause());
        container.querySelectorAll('[data-chunk].playing').forEach(c => c.classList.remove('playing'));
    }

    /**
     * Bind audio event handlers to an HTMLAudioElement.
     * Listens for play, pause, ended, waiting, playing, and playbackstatechange events
     * and delegates to the parent player for state synchronization.
     *
     * @param audioEl - The audio element to bind handlers to.
     * @param index - The chunk index associated with this audio element.
     * @param eventCallback - Optional callback invoked on each audio event.
     */
    _bindAudioEventHandlers(
        audioEl: HTMLAudioElement,
        index: number,
        eventCallback?: (event: string, cardIndex: number) => void,
    ): void {
        if (typeof audioEl.addEventListener !== 'function') return;

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
     * Render all chunk cards into the container.
     * Clears existing content, creates cards for each chunk, and scrolls
     * to the current chunk if one is active.
     */
    renderChunks(): void {
        const container = this._getContainer();
        if (!container) return;

        if (this.player.status === 'generating') {
            this.player.statusCallback(`Generating audio... (${this.player.chunks.length} chunk(s))`);
        }

        container.innerHTML = '';

        if (this.player.chunks.length === 0 && this.player.status !== 'generating') {
            container.classList.add('hidden');
            return;
        }

        container.classList.remove('hidden');

        this.player.chunks.forEach((chunk: any, i: number) => {
            const card = this.createChunkCard(chunk, i, this.audioElementCallback.bind(this));
            container.appendChild(card);
        });

        if (this.player.currentChunkIndex >= 0 && this.player.currentChunkIndex < this.player.chunks.length) {
            const currentCard = container.children[this.player.currentChunkIndex];
            if (currentCard) {
                (currentCard as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    /**
     * Default callback for audio element events (debug logging only).
     * @param _event - The audio event name.
     * @param _index - The chunk index.
     */
    audioElementCallback(_event: string, _index: number): void {
        debugLog(`kokoro-chunk-renderer.audioElementCallback(): event=${_event}: index=${_index}`);
    }

    /**
     * Create a chunk card element containing text and an audio player.
     * The card is clickable to seek directly to that chunk.
     *
     * @param chunk - The chunk data (text + audio Blob).
     * @param index - The chunk index.
     * @param audioElementCallback - Optional callback for audio events.
     * @returns The created card HTMLElement.
     */
    createChunkCard(
        chunk: any,
        index: number,
        audioElementCallback?: (event: string, cardIndex: number) => void,
    ): HTMLElement {
        const card = document.createElement('div');
        const isActive = index === this.player.currentChunkIndex;
        card.className = `tts-card transition-all cursor-pointer ${
            isActive
                ? 'border border-blue-200 dark:border-blue-800'
                : 'border border-transparent hover:bg-blue-100 dark:hover:bg-blue-900'
        }`;
        card.setAttribute('data-chunk', String(index));

        card.onclick = () => {
            const container = this._getContainer();
            this._resetPlaybackState(container);
            this.player._setCardActive(this.player.currentChunkIndex, false);
            this.player.currentChunkIndex = index;
            this.player._setCardActive(index, true);
            this.player._playChunk(index);
        };

        const textEl = document.createElement('p');
        textEl.className = 'text-xs mb-1';
        textEl.textContent = chunk.text;

        const audioEl = this.createAudioElement(chunk, index, audioElementCallback);

        card.appendChild(textEl);
        card.appendChild(audioEl);
        card.id = `card-${index}`;

        return card;
    }

    /**
     * Create an HTMLAudioElement from a chunk's audio Blob.
     * Configures the element with controls, inline playback, auto preload,
     * and muted start (for mobile autoplay policy compliance).
     *
     * @param chunk - The chunk data containing the audio Blob.
     * @param index - The chunk index.
     * @param eventCallback - Optional callback for audio events.
     * @returns The configured HTMLAudioElement.
     */
    createAudioElement(
        chunk: any,
        index: number,
        eventCallback?: (event: string, cardIndex: number) => void,
    ): HTMLAudioElement {
        const audioEl = document.createElement('audio');
        audioEl.id = `audio-chunk-${index}`;
        audioEl.setAttribute('data-chunk', String(index));
        audioEl.src = URL.createObjectURL(chunk.audio);

        this.player.audioPlayer.registerAudioElement(index, audioEl);

        audioEl.controls = true;
        audioEl.playsInline = true;
        audioEl.preload = 'auto';
        audioEl.muted = true;
        audioEl.className = 'w-full mt-0.5';

        this._bindAudioEventHandlers(audioEl, index, eventCallback);

        return audioEl;
    }
}
