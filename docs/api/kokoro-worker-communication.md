# WorkerCommunication API

The `WorkerCommunication` class manages the Web Worker lifecycle for Kokoro TTS.

## Constructor

```typescript
constructor(player: KokoroPlayer)
```

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `worker` | `Worker | null` | Active Worker instance |
| `workerReady` | `boolean` | Worker ready flag |
| `workerInitializing` | `boolean` | Worker initializing flag |

## Methods

| Method | Description |
|--------|-------------|
| `detectWebGPU()` | Check WebGPU availability |
| `initializeWorker()` | Create and initialize the Web Worker |
| `sendText(text, voice, speed)` | Send text to worker for generation |
| `destroyWorker()` | Terminate worker and cleanup |

## Message Protocol

### To Worker

| Message | Fields | Description |
|---------|--------|-------------|
| `init` | `{ status: 'init', useWebGPU: boolean }` | Initialize with backend |
| `generate` | `{ text, voice, speed }` | Generate speech |

### From Worker

| Message | Fields | Description |
|---------|--------|-------------|
| `device` | `{ status: 'device', device: string }` | Backend detected |
| `ready` | `{ status: 'ready' }` | Worker ready |
| `stream` | `{ status: 'stream', chunkIndex, audioBlob }` | Audio chunk ready |
| `complete` | `{ status: 'complete' }` | All chunks done |
| `error` | `{ status: 'error', message }` | Error occurred |
