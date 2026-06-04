# KokoroPlayer API

The `KokoroPlayer` class orchestrates chunk-based audio playback for the Kokoro neural TTS engine.

## Constructor

```typescript
constructor(
    containerId: string,
    statusCallback: (msg: string) => void,
    activeDeviceCallback: (device: string) => void,
    uiStateCallback?: (active: boolean) => void,
    scrollCallback?: (offset: number, length: number) => void,
    onPlayOverCallback?: () => void,
)
```

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `containerId` | `string` | DOM container ID for chunk cards |
| `chunks` | `any[]` | Generated audio chunks |
| `currentChunkIndex` | `number` | Currently playing chunk index |
| `status` | `string` | Player status |
| `isSpeaking` | `boolean` | Whether currently speaking |
| `isStopped` | `boolean` | Explicitly stopped flag |
| `mergedBlob` | `Blob | null` | Merged WAV Blob for download |

## Sub-Modules

| Module | Purpose |
|--------|---------|
| `WorkerCommunication` | Web Worker lifecycle and message routing |
| `AudioPlayer` | Audio element lifecycle and playback |
| `ChunkManager` | Chunk state delegation |
| `ChunkRenderer` | Chunk card DOM rendering |

## Methods

| Method | Description |
|--------|-------------|
| `play(text, voice, speed, startOffset)` | Start playback for given text |
| `stop()` | Stop all playback and cleanup |
| `downloadMerged()` | Merge and download all chunks as WAV |

## Playback States

| Status | Description |
|--------|-------------|
| `ready` | Player ready |
| `generating` | Audio generation in progress |
| `error` | Error occurred |
