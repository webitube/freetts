# ChunkManager API

The `ChunkManager` class delegates chunk state operations to the parent KokoroPlayer.

## Constructor

```typescript
constructor(player: KokoroPlayer)
```

## Methods

| Method | Description |
|--------|-------------|
| `startChunkPlayback(chunkIndex)` | Start playback of the chunk at the given index |
| `handleChunkClick(chunkIndex)` | Handle user click on a chunk card (seek) |
| `onChunkEnded(chunkIndex)` | Notify player that a chunk has finished |
| `isMobileBrowser()` | Check if running on a mobile browser |

## Purpose

Provides a clean separation of concerns between chunk state management and playback orchestration. All operations are delegated to the parent KokoroPlayer.
