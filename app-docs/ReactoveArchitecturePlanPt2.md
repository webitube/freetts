## Reactive Architecture Integration Plan

### **Phase 1: Core Reactive Infrastructure** ✅ **COMPLETED**
**Status**: Done

**Files Created:**
- reactive-value.js - Observable primitive with encapsulated state
- reactive-store.js - Singleton data registry with observable values

**Key Features:**
- Private fields for encapsulation (`#value`, `#subscribers`)
- Set interface for state mutation (via `set()`)
- Observer pattern with subscribe/unsubscribe
- Error handling in subscriber callbacks (try/catch)
- Singleton pattern enforcement
- Central registry for all reactive values

---

### **Phase 2: Audio Card Data Models** ✅ **COMPLETED**
**Status**: Done

**Files Created:**
- audio-card-store.js - Reactive data store for audio card chunks and playback state

**Reactive Values Implemented:**
| Value | Type | Purpose |
|-------|------|---------|
| `chunks` | Array | All audio chunks (text + audio data) |
| `currentChunkIndex` | number | Currently playing chunk index |
| `isSpeaking` | boolean | Whether TTS is actively speaking |
| `chunkPlaying(index)` | boolean | Individual chunk playing state |
| `chunkPlayingStates` | Map | All chunk playing states |
| `cardActive(index)` | boolean | Visual highlight state |
| `cardActiveStates` | Map | All card active states |
| `cardPlaying(index)` | boolean | Visual playing indicator |
| `cardPlayingStates` | Map | All card playing indicators |
| `statusMessage` | string | Status message to display |
| `status` | string | Playback status |
| `chunkCount` | number | Derived count of chunks |

**Key Features:**
- Singleton pattern via `AudioCardStore.getInstance()`
- Encapsulation via private `#store` field
- Derived state (`chunkCount` automatically updates)
- Granular observability (individual + aggregate values)

---

### **Phase 3: Audio Card Actions** ✅ **COMPLETED**
**Status**: Done

**Files Created:**
- audio-card-actions.js - Transactional controller for audio card operations

**Actions Implemented:**
| Category | Methods |
|----------|---------|
| **Chunk Data** | `addChunk()`, `updateChunk()`, `removeChunk()`, `clearChunks()`, `getChunk()`, `getAllChunks()` |
| **Playback State** | `setCurrentChunkIndex()`, `setIsSpeaking()`, `setChunkPlaying()`, `setChunkPlayingStates()` |
| **Card State** | `setCardActive()`, `setCardActiveStates()`, `setCardPlaying()`, `setCardPlayingStates()` |
| **Status** | `setStatusMessage()`, `setStatus()` |
| **Cleanup** | `_cleanupChunkState()`, `_cleanupAllState()` |

**Key Features:**
- Mutational boundary - all state changes go through actions
- Transaction safety - each action ensures consistency
- Automatic cleanup when chunks are removed
- Encapsulated store access

---

### **Phase 4: Integration with KokoroPlayer** ✅ **COMPLETED**
**Status**: Done

**File Modified:**
- kokoro-player.js - Integrated reactive store throughout

**Changes Made:**
1. **Import**: `import { AudioCardStore } from './audio-card-store.js'`
2. **Constructor**: Initialize store and subscribe to `chunks` and `isSpeaking`
3. **New Methods**: 
   - `_syncChunksToUI()` - clear & re-render all chunks
   - `_syncIsSpeakingToUI()` - update status based on speaking state
4. **Updated Methods**:
   - `_appendChunkCard()` - persist data and subscribe to playing states
   - `stop()` - reset all reactive store state
   - `destroy()` - unsubscribe from all listeners

**Key Features:**
- Automatic UI updates when chunks change
- Automatic status updates when speaking state changes
- Fine-grained updates for individual chunk playing states
- Proper cleanup on destroy

---

### **Phase 5: ChunkRenderer Integration** 🔄 **NEXT PHASE**
**Status**: Pending

**File to Modify:**
- kokoro-chunk-renderer.js

**Goal:** Make the chunk renderer use reactive state instead of direct DOM manipulation

**Implementation:**
```javascript
// Current pattern (direct DOM manipulation)
_setCardPlaying(index, playing) {
    const card = this._getCard(index);
    card.classList.toggle('playing', playing);
}

// New pattern (reactive state)
_setCardPlaying(index, playing) {
    this.audioCardStore.setCardPlaying(index, playing);
}

// In createChunkCard callback:
(event, cardIndex) => {
    if (event === 'playing') {
        this.audioCardStore.setCardPlaying(cardIndex, true);
        this.audioCardStore.setCardActive(cardIndex, true);
    } else if (event === 'ended') {
        this.audioCardStore.setCardPlaying(cardIndex, false);
    }
}
```

**Benefits:**
- All DOM updates go through the reactive store
- Multiple components can listen to the same state
- Easier to add animations or transitions reactively

---

### **Phase 6: ChunkManager Integration** 🔄 **NEXT PHASE**
**Status**: Pending

**File to Modify:**
- kokoro-chunk-manager.js

**Goal:** Use reactive actions for chunk management operations

**Implementation:**
```javascript
// Current pattern
_addChunk(chunk) {
    this.chunks.push(chunk);
    this.chunkRenderer.renderChunks();
}

// New pattern
_addChunk(chunk) {
    this.audioCardStore.actions.addChunk(chunk);
    // UI updates automatically via reactive subscription
}

_removeChunk(index) {
    this.audioCardStore.actions.removeChunk(index);
    // UI updates automatically + state cleanup handled
}
```

**Benefits:**
- Single source of truth for chunk data
- Automatic cleanup of associated states
- No manual index tracking needed

---

### **Phase 7: Worker Communication Integration** 🔄 **NEXT PHASE**
**Status**: Pending

**File to Modify:**
- kokoro-worker-communication.js

**Goal:** Use reactive store to broadcast worker events

**Implementation:**
```javascript
// Current pattern
_onWorkerMessage(event) {
    const chunks = event.data.chunks;
    this.player.chunkRenderer.renderChunks(chunks);
}

// New pattern
_onWorkerMessage(event) {
    const chunks = event.data.chunks;
    this.audioCardStore.actions.clearChunks();
    chunks.forEach(chunk => {
        this.audioCardStore.actions.addChunk(chunk);
    });
    // UI updates automatically
}

// For streaming updates:
_onStreamingChunk(chunk) {
    this.audioCardStore.actions.addChunk(chunk);
    // New chunk card appears automatically
}
```

**Benefits:**
- Worker events automatically trigger UI updates
- No need to manually call render methods
- Streaming chunks appear incrementally

---

### **Phase 8: Settings & Voice Manager Integration** 🔄 **NEXT PHASE**
**Status**: Pending

**Files to Modify:**
- voice-manager.js
- settings-persistence.js

**Goal:** Make voice selection and settings changes reactive

**Implementation:**
```javascript
// In voice-manager.js
selectVoice(voiceId) {
    this.audioCardStore.setStatus('ready');
    this.audioCardStore.setStatusMessage(`Using voice: ${voiceId}`);
    // Re-render chunks with new voice
}

// In settings-persistence.js
loadSettings() {
    const settings = ...;
    this.audioCardStore.setStatus(settings.status || 'ready');
    this.audioCardStore.setStatusMessage(settings.statusMessage || '');
}
```

**Benefits:**
- Settings changes immediately reflect in UI
- Voice selection triggers automatic chunk re-render
- Status messages propagate to all listeners

---

### **Phase 9: Global State Unification** 🔄 **NEXT PHASE**
**Status**: Pending

**Goal:** Create a unified global state store that combines all reactive stores

**Implementation:**
```javascript
// src/global-state.js
import { ReactiveStore } from './reactive-store.js';

export class GlobalState {
    static getInstance() {
        if (!GlobalState._instance) {
            GlobalState._instance = new ReactiveStore();
        }
        return GlobalState._instance;
    }
    
    // Central registry for all app state
    // - audio state
    // - settings state
    // - UI state
    // - theme state
}
```

**Benefits:**
- Single place to access all app state
- Cross-reactivity (audio changes affect theme, etc.)
- Simplified debugging and state inspection

---

### **Phase 10: Testing & Validation** 🔄 **NEXT PHASE**
**Status**: Pending

**Test Files to Update:**
- `tests/unit/audio-card-store.test.js` (NEW)
- `tests/unit/audio-card-actions.test.js` (NEW)
- `tests/integration/reactive-integration.test.js` (NEW)

**Test Cases:**
1. **ReactiveValue**: 
   - Value changes trigger callbacks
   - Unsubscribe stops callbacks
   - Error in callback doesn't crash system

2. **ReactiveStore**:
   - Singleton pattern works
   - Keys persist across operations
   - Clear removes all values

3. **AudioCardStore**:
   - All reactive values work correctly
   - Derived state updates properly

4. **AudioCardActions**:
   - Actions mutate store correctly
   - Cleanup removes associated states
   - Invalid indices are handled gracefully

5. **Integration**:
   - KokoroPlayer updates UI when chunks change
   - Stop() resets all state
   - Destroy() cleans up all subscriptions

---

### **Phase 11: Documentation & Migration Guide** 🔄 **NEXT PHASE**
**Status**: Pending

**Files to Create:**
- `app-docs/REACTIVE-ARCHITECTURE.md` - Complete architecture documentation
- `app-docs/MIGRATION-GUIDE.md` - How to migrate existing code
- `app-docs/API-REFERENCE.md` - API documentation for all reactive components

**Content:**
- Overview of reactive architecture principles
- How to use ReactiveValue, ReactiveStore, ReactiveActions
- Best practices for state management
- Common patterns and anti-patterns
- Migration checklist for existing code

---

### **Phase 12: Advanced Features** 🔄 **NEXT PHASE**
**Status**: Pending

**Features to Implement:**
1. **Computed Values** - Automatically derived from other reactive values
   ```javascript
   const totalDuration = chunks.subscribe((chunks) => {
       return chunks.reduce((sum, chunk) => sum + chunk.audio.duration, 0);
   });
   ```

2. **Debounced Actions** - Prevent rapid state changes
   ```javascript
   debouncedSetCardPlaying(index, playing, 100); // 100ms debounce
   ```

3. **Batched Updates** - Combine multiple state changes into one notification
   ```javascript
   this.audioCardStore.batch(() => {
       this.setChunkPlaying(index1, true);
       this.setCardActive(index2, true);
       this.setStatus('loading');
   });
   ```

4. **Persistence** - Auto-save reactive state to localStorage
   ```javascript
   this.audioCardStore.persist('audio-card-state');
   ```

---

## Summary Table

| Phase | Description | Status | Key Files |
|-------|-------------|--------|-----------|
| 1 | Core Reactive Infrastructure | ✅ Done | `reactive-value.js`, `reactive-store.js` |
| 2 | Audio Card Data Models | ✅ Done | `audio-card-store.js` |
| 3 | Audio Card Actions | ✅ Done | `audio-card-actions.js` |
| 4 | Integration with KokoroPlayer | ✅ Done | kokoro-player.js |
| 5 | ChunkRenderer Integration | 🔄 Next | `kokoro-chunk-renderer.js` |
| 6 | ChunkManager Integration | 🔄 Next | `kokoro-chunk-manager.js` |
| 7 | Worker Communication Integration | 🔄 Next | `kokoro-worker-communication.js` |
| 8 | Settings & Voice Manager | 🔄 Next | `voice-manager.js`, `settings-persistence.js` |
| 9 | Global State Unification | 🔄 Next | `global-state.js` |
| 10 | Testing & Validation | 🔄 Next | Various test files |
| 11 | Documentation | 🔄 Next | Multiple docs |
| 12 | Advanced Features | 🔄 Future | N/A |

---

## Next Steps

**Immediate Next Actions:**
1. Review and test Phase 1-4 implementation
2. Run existing tests to ensure no regressions
3. Begin Phase 5: ChunkRenderer integration

**Long-term Goals:**
- Complete all phases within 2-3 weeks
- Achieve 100% test coverage for reactive components
- Document all patterns and anti-patterns
- Create a migration guide for existing codebases