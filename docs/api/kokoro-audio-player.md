# AudioPlayer API

The `AudioPlayer` class manages `<audio>` element lifecycle for Kokoro TTS chunk playback.

## Constructor

```typescript
constructor(player: KokoroPlayer)
```

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `audioElements` | `HTMLAudioElement[]` | Registered audio elements by chunk index |

## Methods

| Method | Description |
|--------|-------------|
| `registerAudioElement(chunkIndex, audioEl)` | Register an audio element at a chunk index |
| `createAudioElement(chunkIndex, audioBlob)` | Create audio element from WAV Blob |
| `playChunk(chunkIndex)` | Play the audio chunk at the given index |
| `stopAll()` | Pause all audio elements and reset position |
| `cleanup()` | Revoke object URLs and remove elements |

## Usage

```typescript
const audio = player.createAudioElement(0, audioBlob);
audio.play().catch(err => {
    player._onChunkEnded(0);
});
```

## Object URL Lifecycle

1. `URL.createObjectURL(blob)` creates a temporary URL
2. Audio element uses the URL as its source
3. `URL.revokeObjectURL(url)` cleans up after playback
4. URLs are revoked during cleanup or when chunks are replaced
