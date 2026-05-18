/**
 * AudioCardActions — Transactional controller for audio card operations
 */
import { ReactiveStore } from './reactive-store.js';

export class AudioCardActions {
    constructor(store = new ReactiveStore()) {
        this.store = store;
    }

    // ─── Chunk Data Actions ───────────────────────────────────────────────

    /**
     * Add a new audio chunk
     * @param {object} chunk - { text: string, audio: Blob }
     */
    addChunk(chunk) {
        const chunks = this.store.register('chunks', []);
        const newChunks = [...chunks.get(), chunk];
        chunks.set(newChunks);
    }

    /**
     * Update an existing chunk by index
     * @param {number} index - Chunk index
     * @param {object} chunk - { text: string, audio: Blob }
     */
    updateChunk(index, chunk) {
        const chunks = this.store.register('chunks', []);
        const currentChunks = chunks.get();
        if (index >= 0 && index < currentChunks.length) {
            const newChunks = [...currentChunks];
            newChunks[index] = chunk;
            chunks.set(newChunks);
        }
    }

    /**
     * Remove a chunk by index
     * @param {number} index - Chunk index to remove
     */
    removeChunk(index) {
        const chunks = this.store.register('chunks', []);
        const currentChunks = chunks.get();
        if (index >= 0 && index < currentChunks.length) {
            const newChunks = currentChunks.filter((_, i) => i !== index);
            chunks.set(newChunks);
            // Clean up associated state
            this._cleanupChunkState(index);
        }
    }

    /**
     * Clear all chunks
     */
    clearChunks() {
        this.store.register('chunks', []).set([]);
        // Clean up all associated state
        this._cleanupAllState();
    }

    /**
     * Get chunk by index
     * @param {number} index - Chunk index
     * @returns {object|null}
     */
    getChunk(index) {
        const chunks = this.store.register('chunks', []);
        const currentChunks = chunks.get();
        return index >= 0 && index < currentChunks.length
            ? currentChunks[index]
            : null;
    }

    /**
     * Get all chunks
     * @returns {Array}
     */
    getAllChunks() {
        const chunks = this.store.register('chunks', []);
        return chunks.get();
    }

    // ─── Playback State Actions ───────────────────────────────────────────

    /**
     * Set current playing chunk index
     * @param {number} index - New current chunk index
     */
    setCurrentChunkIndex(index) {
        this.store.register('currentChunkIndex', -1).set(index);
    }

    /**
     * Set speaking state
     * @param {boolean} isSpeaking - Whether TTS is actively speaking
     */
    setIsSpeaking(isSpeaking) {
        this.store.register('isSpeaking', false).set(isSpeaking);
    }

    /**
     * Set a single chunk's playing state
     * @param {number} index - Chunk index
     * @param {boolean} playing - Whether this chunk is currently playing
     */
    setChunkPlaying(index, playing) {
        const chunkPlayingStates = this.store.register('chunkPlayingStates', new Map());
        const newStates = new Map(chunkPlayingStates.get());
        newStates.set(index, playing);
        chunkPlayingStates.set(newStates);
        this.store.register(`chunkPlaying-${index}`, false).set(playing);
    }

    /**
     * Set all chunk playing states
     * @param {Map<number, boolean>} states - Map of index -> playing state
     */
    setChunkPlayingStates(states) {
        this.store.register('chunkPlayingStates', new Map()).set(new Map(states));
    }

    /**
     * Set a single card's active state (visual highlight)
     * @param {number} index - Chunk index
     * @param {boolean} active - Whether this card is the active one
     */
    setCardActive(index, active) {
        this.store.register(`cardActive-${index}`, false).set(active);
        // Also update the global map for consistency
        const cardActiveStates = this.store.register('cardActiveStates', new Map());
        const newStates = new Map(cardActiveStates.get());
        newStates.set(index, active);
        cardActiveStates.set(newStates);
    }

    /**
     * Set all card active states
     * @param {Map<number, boolean>} states - Map of index -> active state
     */
    setCardActiveStates(states) {
        this.store.register('cardActiveStates', new Map()).set(new Map(states));
    }

    /**
     * Set a single card's playing state (visual indicator)
     * @param {number} index - Chunk index
     * @param {boolean} playing - Whether this card is currently playing
     */
    setCardPlaying(index, playing) {
        this.store.register(`cardPlaying-${index}`, false).set(playing);
        const cardPlayingStates = this.store.register('cardPlayingStates', new Map());
        const newStates = new Map(cardPlayingStates.get());
        newStates.set(index, playing);
        cardPlayingStates.set(newStates);
    }

    /**
     * Get a single card's playing state (visual indicator)
     * @param {number} index - Chunk index
     * @returns {ReactiveValue<boolean>}
     */
    getCardPlaying(index) {
        return this.store.register(`cardPlaying-${index}`, false);
    }

    /**
     * Get a single card's active state (visual highlight)
     * @param {number} index - Chunk index
     * @returns {ReactiveValue<boolean>}
     */
    getCardActive(index) {
        return this.store.register(`cardActive-${index}`, false);
    }

    /**
     * Get a single chunk's playing state
     * @param {number} index - Chunk index
     * @returns {ReactiveValue<boolean>}
     */
    getChunkPlaying(index) {
        const chunkPlayingStates = this.store.register('chunkPlayingStates', new Map());
        return this.store.register(`chunkPlaying-${index}`, false);
    }

    /**
     * Get current chunk index
     * @returns {ReactiveValue<number>}
     */
    getCurrentChunkIndex() {
        return this.store.register('currentChunkIndex', -1);
    }

    /**
     * Get isSpeaking state
     * @returns {ReactiveValue<boolean>}
     */
    getIsSpeaking() {
        return this.store.register('isSpeaking', false);
    }

    /**
     * Get chunk playing states for all chunks
     * @returns {ReactiveValue<Map<number, boolean>>}
     */
    getChunkPlayingStates() {
        return this.store.register('chunkPlayingStates', new Map());
    }

    /**
     * Get card active states for all chunks
     * @returns {ReactiveValue<Map<number, boolean>>}
     */
    getCardActiveStates() {
        return this.store.register('cardActiveStates', new Map());
    }

    /**
     * Get card playing states for all chunks
     * @returns {ReactiveValue<Map<number, boolean>>}
     */
    getCardPlayingStates() {
        return this.store.register('cardPlayingStates', new Map());
    }

    /**
     * Set all card playing states
     * @param {Map<number, boolean>} states - Map of index -> playing state
     */
    setCardPlayingStates(states) {
        this.store.register('cardPlayingStates', new Map()).set(new Map(states));
    }

    // ─── Status Actions ───────────────────────────────────────────────────

    /**
     * Set status message
     * @param {string} message - Status message to display
     */
    setStatusMessage(message) {
        this.store.register('statusMessage', '').set(message);
    }

    /**
     * Set playback status
     * @param {string} status - 'ready' | 'loading' | 'generating' | 'error'
     */
    setStatus(status) {
        this.store.register('status', 'ready').set(status);
    }

    /**
     * Get status message
     * @returns {ReactiveValue<string>}
     */
    getStatusMessage() {
        return this.store.register('statusMessage', '');
    }

    /**
     * Get playback status
     * @returns {ReactiveValue<string>}
     */
    getStatus() {
        return this.store.register('status', 'ready');
    }

    // ─── Internal Cleanup ─────────────────────────────────────────────────

    _cleanupChunkState(index) {
        // Remove playing states for removed chunk
        const chunkPlayingStates = this.store.register('chunkPlayingStates', new Map());
        const chunkStates = new Map(chunkPlayingStates.get());
        chunkStates.delete(index);
        chunkPlayingStates.set(chunkStates);
        this.store.register(`chunkPlaying-${index}`, false).set(false);

        const cardPlayingStates = this.store.register('cardPlayingStates', new Map());
        const cardPlayingStatesMap = new Map(cardPlayingStates.get());
        cardPlayingStatesMap.delete(index);
        cardPlayingStates.set(cardPlayingStatesMap);
        this.store.register(`cardPlaying-${index}`, false).set(false);

        const cardActiveStates = this.store.register('cardActiveStates', new Map());
        const cardActiveStatesMap = new Map(cardActiveStates.get());
        cardActiveStatesMap.delete(index);
        cardActiveStates.set(cardActiveStatesMap);
        this.store.register(`cardActive-${index}`, false).set(false);
    }

    _cleanupAllState() {
        this.store.register('chunkPlayingStates', new Map()).set(new Map());
        this.store.register('cardPlayingStates', new Map()).set(new Map());
        this.store.register('cardActiveStates', new Map()).set(new Map());
        this.store.clear();
    }
}
