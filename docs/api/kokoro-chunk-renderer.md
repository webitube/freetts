# ChunkRenderer API

The `ChunkRenderer` class renders chunk cards into the DOM container for Kokoro TTS playback.

## Constructor

```typescript
constructor(player: KokoroPlayer)
```

## Methods

| Method | Description |
|--------|-------------|
| `_getContainer()` | Get the chunk container element by ID |
| `_resetPlaybackState(container)` | Pause all audio and remove playing indicators |
| `_bindAudioEventHandlers(audioEl, index, eventCallback)` | Bind play/pause/ended/waiting/playing events |
| `_renderChunkCard(chunk, index)` | Create a DOM card for a chunk |
| `renderChunks()` | Render all chunk cards in the container |

## Chunk Card Structure

Each chunk card contains:
- Text label showing the chunk content
- HTMLAudioElement for playback
- Play/pause button
- Playing state indicator

## Event Binding

Audio events are bound and delegated to the parent player:
- `play` → `_onChunkPlay(index)`
- `pause` → `_updatePlayButton(index, false)`
- `ended` → `_onChunkEnded(index)`
- `waiting` → Show loading indicator
- `playing` → Update playing state
