/**
 * AudioCardStore — Reactive data store for audio card chunks and playback state
 */
import { ReactiveStore } from './reactive-store.js';
import { AudioCardActions } from './audio-card-actions.js';

export class AudioCardStore extends AudioCardActions {
    static instance = null;
    #store;

    constructor() {
        if (AudioCardStore.instance) {
            return AudioCardStore.instance;
        }
        const store = new ReactiveStore();
        super(store);
        AudioCardStore.instance = this;
        this.#store = store;

        // Initialize derived reactive values
        this.chunks.subscribe(chunks => {
            this.chunkCount.set(chunks.length);
        });
    }

    /**
     * Reset the singleton instance (primarily for testing)
     */
    static resetInstance() {
        AudioCardStore.instance = null;
    }

    // ─── Public API ──────────────────────────────────────────────────────

    /**
     * Get the singleton store instance
     * @returns {AudioCardStore}
     */
    static getInstance() {
        return new AudioCardStore();
    }

    /**
     * Get the internal store
     * @returns {ReactiveStore}
     */
    getStore() {
        return this.#store;
    }

    // ─── Reactive Values ─────────────────────────────────────────────────

    /**
     * Get all audio chunks
     * @returns {ReactiveValue<Array>}
     */
    get chunks() {
        return this.#store.register('chunks', []);
    }

    /**
     * Get current playing chunk index
     * @returns {ReactiveValue<number>}
     */
    getCurrentChunkIndex() {
        return this.#store.register('currentChunkIndex', -1);
    }

    /**
     * Get isSpeaking state
     * @returns {ReactiveValue<boolean>}
     */
    get isSpeaking() {
        return this.#store.register('isSpeaking', false);
    }

    /**
     * Get active chunk playing state (per-index)
     * @param {number} index - Chunk index
     * @returns {ReactiveValue<boolean>}
     */
    getChunkPlaying(index) {
        return this.#store.register(`chunkPlaying-${index}`, false);
    }

    /**
     * Get chunk playing state for all chunks
     * @returns {ReactiveValue<Map<number, boolean>>}
     */
    get chunkPlayingStates() {
        return this.#store.register('chunkPlayingStates', new Map());
    }

    /**
     * Get card active state (for visual highlighting)
     * @param {number} index - Chunk index
     * @returns {ReactiveValue<boolean>}
     */
    getCardActive(index) {
        return this.#store.register(`cardActive-${index}`, false);
    }

    /**
     * Get card active states for all chunks
     * @returns {ReactiveValue<Map<number, boolean>>}
     */
    get cardActiveStates() {
        return this.#store.register('cardActiveStates', new Map());
    }

    /**
     * Get card playing state (visual playing indicator)
     * @param {number} index - Chunk index
     * @returns {ReactiveValue<boolean>}
     */
    getCardPlaying(index) {
        return this.#store.register(`cardPlaying-${index}`, false);
    }

    /**
     * Get card playing states for all chunks
     * @returns {ReactiveValue<Map<number, boolean>>}
     */
    get cardPlayingStates() {
        return this.#store.register('cardPlayingStates', new Map());
    }

    /**
     * Get playback status message
     * @returns {ReactiveValue<string>}
     */
    getStatusMessage() {
        return this.#store.register('statusMessage', '');
    }

    /**
     * Get playback status
     * @returns {ReactiveValue<string>}
     */
    getStatus() {
        return this.#store.register('status', 'ready');
    }

    /**
     * Get total chunk count (derived from chunks array)
     * @returns {ReactiveValue<number>}
     */
    get chunkCount() {
        return this.#store.register('chunkCount', 0);
    }
}
