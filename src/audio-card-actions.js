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
        const chunks = this.store.get('chunks');
        if (!chunks) {
            chunks.set([]);
        }
        const newChunks = [...chunks.get(), chunk];
        chunks.set(newChunks);
    }

    /**
     * Update an existing chunk by index
     * @param {number} index - Chunk index
     * @param {object} chunk - { text: string, audio: Blob }
     */
    updateChunk(index, chunk) {
        const chunks = this.store.get('chunks');
        if (!chunks) return;
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
        const chunks = this.store.get('chunks');
        if (!chunks) return;
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
        this.store.get('chunks').set([]);
        // Clean up all associated state
        this._cleanupAllState();
    }

    /**
     * Get chunk by index
     * @param {number} index - Chunk index
     * @returns {object|null}
     */
    getChunk(index) {
        const chunks = this.store.get('chunks');
        if (!chunks) return null;
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
        const chunks = this.store.get('chunks');
        return chunks ? chunks.get() : [];
    }

    // ─── Playback State Actions ───────────────────────────────────────────

    /**
     * Set current playing chunk index
     * @param {number} index - New current chunk index
     */
    setCurrentChunkIndex(index) {
        this.store.get('currentChunkIndex').set(index);
    }

    /**
     * Set speaking state
     * @param {boolean} isSpeaking - Whether TTS is actively speaking
     */
    setIsSpeaking(isSpeaking) {
        this.store.get('isSpeaking').set(isSpeaking);
    }

    /**
     * Set a single chunk's playing state
     * @param {number} index - Chunk index
     * @param {boolean} playing - Whether this chunk is currently playing
     */
    setChunkPlaying(index, playing) {
        const chunkPlayingStates = this.store.get('chunkPlayingStates');
        if (!chunkPlayingStates) {
            chunkPlayingStates.set(new Map());
        }
        chunkPlayingStates.get().set(index, playing);
    }

    /**
     * Set all chunk playing states
     * @param {Map<number, boolean>} states - Map of index -> playing state
     */
    setChunkPlayingStates(states) {
        this.store.get('chunkPlayingStates').set(new Map(states));
    }

    /**
     * Set a single card's active state (visual highlight)
     * @param {number} index - Chunk index
     * @param {boolean} active - Whether this card is the active one
     */
    setCardActive(index, active) {
        this.store.get(`cardActive-${index}`).set(active);
        // Also update the global map for consistency
        const cardActiveStates = this.store.get('cardActiveStates');
        if (!cardActiveStates) {
            cardActiveStates.set(new Map());
        }
        cardActiveStates.get().set(index, active);
    }

    /**
     * Set all card active states
     * @param {Map<number, boolean>} states - Map of index -> active state
     */
    setCardActiveStates(states) {
        this.store.get('cardActiveStates').set(new Map(states));
    }

    /**
     * Set a single card's playing state (visual indicator)
     * @param {number} index - Chunk index
     * @param {boolean} playing - Whether this card is currently playing
     */
    setCardPlaying(index, playing) {
        this.store.get(`cardPlaying-${index}`).set(playing);
        const cardPlayingStates = this.store.get('cardPlayingStates');
        if (!cardPlayingStates) {
            cardPlayingStates.set(new Map());
        }
        cardPlayingStates.get().set(index, playing);
    }

    /**
     * Set all card playing states
     * @param {Map<number, boolean>} states - Map of index -> playing state
     */
    setCardPlayingStates(states) {
        this.store.get('cardPlayingStates').set(new Map(states));
    }

    // ─── Status Actions ───────────────────────────────────────────────────

    /**
     * Set status message
     * @param {string} message - Status message to display
     */
    setStatusMessage(message) {
        this.store.get('statusMessage').set(message);
    }

    /**
     * Set playback status
     * @param {string} status - 'ready' | 'loading' | 'generating' | 'error'
     */
    setStatus(status) {
        this.store.get('status').set(status);
    }

    // ─── Internal Cleanup ─────────────────────────────────────────────────

    _cleanupChunkState(index) {
        // Remove playing states for removed chunk
        const chunkPlayingStates = this.store.get('chunkPlayingStates');
        if (chunkPlayingStates) {
            const states = chunkPlayingStates.get();
            states.delete(index);
            chunkPlayingStates.set(new Map(states));
        }
        const cardPlayingStates = this.store.get('cardPlayingStates');
        if (cardPlayingStates) {
            const states = cardPlayingStates.get();
            states.delete(index);
            cardPlayingStates.set(new Map(states));
        }
        const cardActiveStates = this.store.get('cardActiveStates');
        if (cardActiveStates) {
            const states = cardActiveStates.get();
            states.delete(index);
            cardActiveStates.set(new Map(states));
        }
    }

    _cleanupAllState() {
        this.store.get('chunkPlayingStates').set(new Map());
        this.store.get('cardPlayingStates').set(new Map());
        this.store.get('cardActiveStates').set(new Map());
    }
}
