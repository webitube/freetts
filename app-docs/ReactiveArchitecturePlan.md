## Plan: Audio Card Data Store with Reactive Architecture

### Overview
This plan implements a parallel data structure that mirrors the audio card state using `ReactiveStore` and `ReactiveValue` classes. The store will maintain a complete, observable copy of all audio card data and playback state, enabling reactive UI updates without direct DOM manipulation.

---

### Phase 1: Core Reactive Infrastructure

**File: `src/reactive-store.js`** (New)
```javascript
/**
 * ReactiveStore — Singleton data registry with observable values
 */
export class ReactiveStore {
    static instance = null;
    #registry = new Map();

    constructor() {
        if (ReactiveStore.instance) {
            return ReactiveStore.instance;
        }
        ReactiveStore.instance = this;
    }

    /**
     * Register or retrieve a ReactiveValue by key
     * @param {string} key - Unique identifier
     * @param {*} initialValue - Initial value
     * @returns {ReactiveValue}
     */
    register(key, initialValue = null) {
        if (!this.#registry.has(key)) {
            this.#registry.set(key, new ReactiveValue(initialValue));
        }
        return this.#registry.get(key);
    }

    get(key) {
        return this.#registry.get(key);
    }

    has(key) {
        return this.#registry.has(key);
    }

    /**
     * Clear all values (e.g., on page unload)
     */
    clear() {
        this.#registry.clear();
    }
}
```

**File: `src/reactive-value.js`** (New)
```javascript
/**
 * ReactiveValue — Observable primitive with encapsulated state
 */
export class ReactiveValue {
    #value;
    #subscribers = new Set();

    constructor(initialValue = null) {
        this.#value = initialValue;
    }

    get() {
        return this.#value;
    }

    set(newValue) {
        if (this.#value !== newValue) {
            const oldValue = this.#value;
            this.#value = newValue;
            this.notify(newValue, oldValue);
        }
    }

    subscribe(callback) {
        this.#subscribers.add(callback);
        return () => {
            this.#subscribers.delete(callback);
        };
    }

    notify(current, previous) {
        this.#subscribers.forEach(callback => {
            try {
                callback(current, previous);
            } catch (error) {
                console.error('Failed to propagate reactive state update:', error);
            }
        });
    }
}
```

---

### Phase 2: Audio Card Data Models

**File: `src/audio-card-store.js`** (New)
```javascript
/**
 * AudioCardStore — Reactive data store for audio card chunks and playback state
 */
import { ReactiveStore, ReactiveValue } from './reactive-store.js';

export class AudioCardStore {
    #store;
    #actions;

    constructor() {
        this.#store = new ReactiveStore();
        this.#actions = new AudioCardActions(this.#store);
    }

    // ─── Public API ──────────────────────────────────────────────────────

    /**
     * Get the singleton store instance
     * @returns {ReactiveStore}
     */
    static getInstance() {
        return new AudioCardStore().getStore();
    }

    /**
     * Get the actions controller
     * @returns {AudioCardActions}
     */
    get actions() {
        return this.#actions;
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
     * Get total chunk count
     * @returns {ReactiveValue<number>}
     */
    get chunkCount() {
        return this.chunks.subscribe((chunks) => {
            this.#store.register('chunkCount', chunks.length);
        });
    }

    // ─── Actions (via Actions class) ──────────────────────────────────────
}
```

---

### Phase 3: Audio Card Actions (Transactional Controller)

**File: `src/audio-card-actions.js`** (New)
```javascript
/**
 * AudioCardActions — Transactional controller for audio card operations
 */
import { ReactiveStore, ReactiveValue } from './reactive-store.js';

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
```

---

### Phase 4: Integration with Existing Code

**File: kokoro-player.js** (Modify)
```javascript
// At the top of the file, import the store
import { AudioCardStore } from './audio-card-store.js';

export class KokoroPlayer {
    constructor(containerId, statusCallback, activeDeviceCallback, uiStateCallback, scrollCallback, onPlayOverCallback) {
        // ... existing code ...
        
        // NEW: Initialize reactive store
        this.audioCardStore = AudioCardStore.getInstance();
        
        // Subscribe to chunks to keep UI in sync
        const unsubscribeChunks = this.audioCardStore.chunks.subscribe((newChunks) => {
            this._syncChunksToUI(newChunks);
        });
        
        // Subscribe to playback state
        const unsubscribeIsSpeaking = this.audioCardStore.isSpeaking.subscribe((isSpeaking) => {
            this._syncIsSpeakingToUI(isSpeaking);
        });
        
        this._unsubscribeHandlers = {
            chunks: unsubscribeChunks,
            isSpeaking: unsubscribeIsSpeaking
        };
    }

    /**
     * Sync chunks from store to DOM
     */
    _syncChunksToUI(chunks) {
        const container = this._getContainer();
        if (!container) return;

        // Clear existing cards
        container.innerHTML = '';

        // Render all chunks
        chunks.forEach((chunk, index) => {
            this._appendChunkCard(chunk, index);
        });

        // Reset playback state
        this.currentChunkIndex = -1;
        this.isSpeaking = false;
        this.audioCardStore.setCurrentChunkIndex(-1);
        this.audioCardStore.setIsSpeaking(false);
    }

    /**
     * Sync speaking state to UI
     */
    _syncIsSpeakingToUI(isSpeaking) {
        if (isSpeaking) {
            this.status = 'ready';
            this._setStatusState('ready', 'Ready.');
        } else {
            this._setStatusState('ready', 'Ready.');
        }
    }

    /**
     * Append a single chunk card incrementally (for streaming)
     */
    _appendChunkCard(chunk, index) {
        // ... existing code ...
        
        // NEW: Update store with chunk data
        this.audioCardStore.addChunk(chunk);
        
        // Subscribe to this chunk's playing state
        const unsubscribeChunkPlaying = this.audioCardStore.getChunkPlaying(index).subscribe((playing) => {
            this._setCardPlaying(index, playing);
        });
        
        // Add to unsubscribe handlers
        if (!this._unsubscribeHandlers.chunkPlaying) {
            this._unsubscribeHandlers.chunkPlaying = new Map();
        }
        this._unsubscribeHandlers.chunkPlaying.set(index, unsubscribeChunkPlaying);
    }

    /**
     * Stop all playback and reset state
     */
    stop() {
        // Stop existing playback
        // ... existing code ...
        
        // NEW: Reset store state
        this.audioCardStore.setCurrentChunkIndex(-1);
        this.audioCardStore.setIsSpeaking(false);
        this.audioCardStore.setChunkPlayingStates(new Map());
        this.audioCardStore.setCardPlayingStates(new Map());
    }

    /**
     * Destroy the player and clean up resources
     */
    destroy() {
        // ... existing code ...
        
        // NEW: Unsubscribe from reactive store
        if (this._unsubscribeHandlers) {
            this._unsubscribeHandlers.chunks();
            this._unsubscribeHandlers.isSpeaking();
            if (this._unsubscribeHandlers.chunkPlaying) {
// At the top of the file, import the store
import { AudioCardStore } from './audio-card-store.js';

export class KokoroPlayer {
    constructor(containerId, statusCallback, activeDeviceCallback, uiStateCallback, scrollCallback, onPlayOverCallback) {
        // ... existing code ...
        
        // NEW: Initialize reactive store
        this.audioCardStore = AudioCardStore.getInstance();
        
        // Subscribe to chunks to keep UI in sync
        const unsubscribeChunks = this.audioCardStore.chunks.subscribe((newChunks) => {
            this._syncChunksToUI(newChunks);
        });
        
        // Subscribe to playback state
        const unsubscribeIsSpeaking = this.audioCardStore.isSpeaking.subscribe((isSpeaking) => {
            this._syncIsSpeakingToUI(isSpeaking);
        });
        
        this._unsubscribeHandlers = {
            chunks: unsubscribeChunks,
            isSpeaking: unsubscribeIsSpeaking
        };
    }

    /**
     * Sync chunks from store to DOM
     */
    _syncChunksToUI(chunks) {
        const container = this._getContainer();
        if (!container) return;

        // Clear existing cards
        container.innerHTML = '';

        // Render all chunks
        chunks.forEach((chunk, index) => {
            this._appendChunkCard(chunk, index);
        });

        // Reset playback state
        this.currentChunkIndex = -1;
        this.isSpeaking = false;
        this.audioCardStore.setCurrentChunkIndex(-1);
        this.audioCardStore.setIsSpeaking(false);
    }

    /**
     * Sync speaking state to UI
     */
    _syncIsSpeakingToUI(isSpeaking) {
        if (isSpeaking) {
            this.status = 'ready';
            this._setStatusState('ready', 'Ready.');
        } else {
            this._setStatusState('ready', 'Ready.');
        }
    }

    /**
     * Append a single chunk card incrementally (for streaming)
     */
    _appendChunkCard(chunk, index) {
        // ... existing code ...
        
        // NEW: Update store with chunk data
        this.audioCardStore.addChunk(chunk);
        
        // Subscribe to this chunk's playing state
        const unsubscribeChunkPlaying = this.audioCardStore.getChunkPlaying(index).subscribe((playing) => {
            this._setCardPlaying(index, playing);
        });
        
        // Add to unsubscribe handlers
        if (!this._unsubscribeHandlers.chunkPlaying) {
            this._unsubscribeHandlers.chunkPlaying = new Map();
        }
        this._unsubscribeHandlers.chunkPlaying.set(index, unsubscribeChunkPlaying);
    }

    /**
     * Stop all playback and reset state
     */
    stop() {
        // Stop existing playback
        // ... existing code ...
        
        // NEW: Reset store state
        this.audioCardStore.setCurrentChunkIndex(-1);
        this.audioCardStore.setIsSpeaking(false);
        this.audioCardStore.setChunkPlayingStates(new Map());
        this.audioCardStore.setCardPlayingStates(new Map());
    }

    /**
     * Destroy the player and clean up resources
     */
    destroy() {
        // ... existing code ...
        
        // NEW: Unsubscribe from reactive store
        if (this._unsubscribeHandlers) {
            this._unsubscribeHandlers.chunks();
            this._unsubscribeHandlers.isSpeaking();
            if (this._unsubscribeHandlers.chunkPlaying) {
