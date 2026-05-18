/**
 * AudioCardStore — Reactive data store for audio card chunks and playback state
 */
import { ReactiveStore } from './reactive-store.js';

export class AudioCardStore extends ReactiveStore {
    static instance = null;
    static chunks = [];
    #store;

    constructor() {
        if (AudioCardStore.instance) {
            return AudioCardStore.instance;
        }
        const store = new ReactiveStore();
        super(store);
        AudioCardStore.instance = this;
        this.#store = store;

        //// Initialize derived reactive values
        //this.chunks.subscribe(chunks => {
        //    this.chunkCount.set(chunks.length);
        //});
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
        return AudioCardStore.getInstance().#store;
    }

    // ─── Reactive Values ─────────────────────────────────────────────────

    /**
     * Get all audio chunks
     * @returns {ReactiveValue<Array>}
     */
    static getChunks() {
        return AudioCardStore.getInstance().#store.register('chunks', []);
    }

    /**
     * Get current playing chunk index
     * @returns {ReactiveValue<number>}
     */
    static getCurrentChunkIndex() {
        return AudioCardStore.getInstance().#store.register('currentChunkIndex', -1);
    }

    /**
     * Get isSpeaking state
     * @returns {ReactiveValue<boolean>}
     */
    static getIsSpeaking() {
        return AudioCardStore.getInstance().#store.register('isSpeaking', false);
    }

    /**
     * Get active chunk playing state (per-index)
     * @param {number} index - Chunk index
     * @returns {ReactiveValue<boolean>}
     */
    static getChunkPlaying(index) {
        return AudioCardStore.getInstance().#store.register(`chunkPlaying-${index}`, false);
    }

    /**
     * Get chunk playing state for all chunks
     * @returns {ReactiveValue<Map<number, boolean>>}
     */
    static getChunkPlayingStates() {
        return AudioCardStore.getInstance().#store.register('chunkPlayingStates', new Map());
    }

    /**
     * Get card active state (for visual highlighting)
     * @param {number} index - Chunk index
     * @returns {ReactiveValue<boolean>}
     */
    static getCardActive(index) {
        return AudioCardStore.getInstance().#store.register(`cardActive-${index}`, false);
    }

    /**
     * Get card active states for all chunks
     * @returns {ReactiveValue<Map<number, boolean>>}
     */
    static getCardActiveStates() {
        return AudioCardStore.getInstance().#store.register('cardActiveStates', new Map());
    }

    /**
     * Get card playing state (visual playing indicator)
     * @param {number} index - Chunk index
     * @returns {ReactiveValue<boolean>}
     */
    static getCardPlaying(index) {
        return AudioCardStore.getInstance().#store.register(`cardPlaying-${index}`, false);
    }

    /**
     * Get card playing states for all chunks
     * @returns {ReactiveValue<Map<number, boolean>>}
     */
    static getCardPlayingStates() {
        return AudioCardStore.getInstance().#store.register('cardPlayingStates', new Map());
    }

    // ─── Status Message ───────────────────────────────────────────────────
    /**
     * Get playback status message
     * @returns {ReactiveValue<string>}
     */
    static getStatusMessage() {
        return AudioCardStore.getInstance().#store.register('statusMessage', '');
    }

    /**
     * Set status message
     * @param {string} message - Status message to display
     */
    static setStatusMessage(message) {
        AudioCardStore.getInstance().store.register('statusMessage', '').set(message);
    }

    // ─── Status ───────────────────────────────────────────────────
    /**
     * Get playback status
     * @returns {ReactiveValue<string>}
     */
    static getStatus() {
        return AudioCardStore.getInstance().#store.register('status', 'ready');
    }

    /**
     * Set playback status
     * @param {string} status - 'ready' | 'loading' | 'generating' | 'error'
     */
    static setStatus(status) {
        AudioCardStore.getInstance().store.register('status', 'ready').set(status);
    }

    // ─── Chunk ───────────────────────────────────────────────────

    /**
     * Get total chunk count (derived from chunks array)
     * @returns {ReactiveValue<number>}
     */
    static getChunkCount() {
        return AudioCardStore.getInstance().#store.register('chunkCount', 0);
    }
}
