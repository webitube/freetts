# State Management

FreeTTS uses a centralized reactive state pattern powered by [ReactiveTypescript](https://github.com/ReactiveTypescript/ReactiveTypescript). This document describes the state architecture, patterns, and usage.

## AppStore Singleton

The `AppStore` is a singleton that manages all application state. All modules subscribe to reactive properties and react to changes automatically.

```typescript
// Access the singleton
const store = AppStore.instance;

// Read a reactive value
const engine = store.engine.get();

// Write a reactive value (triggers subscriptions)
store.engine.set(EngineEnum.Kokoro);
```

## Reactive Property Types

| Type | Description | Example |
|------|-------------|---------|
| `ReactiveValue<T>` | Single reactive value with get/set | `engine`, `voice`, `speed` |
| `ReactiveList<T>` | Reactive array with add/remove/clear | `voices`, `kokoroVoices` |
| `ReactiveDictionary<K,V>` | Reactive key-value map | `kokoroVoicesMap` |

## Decorators

Properties are marked as reactive using TypeScript decorators:

```typescript
class AppStore {
    @reactiveValue
    engine: ReactiveValue<EngineEnum> = new ReactiveValue(EngineEnum.WebSpeech);

    @reactiveList
    voices: ReactiveList<VoiceInfo> = new ReactiveList();

    @reactiveDict
    kokoroVoicesMap: ReactiveDictionary<string, KokoroVoiceInfo> = new ReactiveDictionary();

    @jsonIgnore
    private debugLog: string[] = [];  // Excluded from serialization
}
```

## Enums

### EngineEnum

```typescript
enum EngineEnum {
    Unknown = 'unknown',
    WebSpeech = 'webspeech',
    Kokoro = 'kokoro',
}
```

### StatusEnum

```typescript
enum StatusEnum {
    Unknown = 'unknown',
    Loading = 'loading',
    Ready = 'ready',
    Generating = 'generating',
    Error = 'error',
}
```

### ThemeEnum

```typescript
enum ThemeEnum {
    Unknown = 'unknown',
    Light = 'light',
    Dark = 'dark',
}
```

## State Properties

### TTS Settings

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `engine` | `ReactiveValue<EngineEnum>` | `WebSpeech` | Current TTS engine |
| `voice` | `ReactiveValue<string>` | `''` | Selected voice name |
| `speed` | `ReactiveValue<number>` | `1.0` | Playback speed (0.5–2.0) |
| `pitch` | `ReactiveValue<number>` | `1.0` | Voice pitch (0.5–2.0) |
| `savedVoices` | `ReactiveDictionary<string, string>` | `{}` | Per-engine saved voices |

### Playback State

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `isPlaying` | `ReactiveValue<boolean>` | `false` | Playback active |
| `isSpeaking` | `ReactiveValue<boolean>` | `false` | TTS speaking |
| `isStopped` | `ReactiveValue<boolean>` | `false` | Explicitly stopped |
| `status` | `ReactiveValue<StatusEnum>` | `Unknown` | Kokoro status |
| `activeDevice` | `ReactiveValue<string>` | `''` | Active audio device |

### Editor State

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `currentMarkdown` | `ReactiveValue<string>` | `''` | Current editor content |
| `isSourceMode` | `ReactiveValue<boolean>` | `true` | Editor mode flag |

### UI State

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `theme` | `ReactiveValue<ThemeEnum>` | `Light` | UI theme |
| `debugMode` | `ReactiveValue<boolean>` | `false` | Debug logging |

### Voice Data

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `voices` | `ReactiveList<VoiceInfo>` | `[]` | Web Speech voices |
| `kokoroVoices` | `ReactiveList<KokoroVoiceInfo>` | `[]` | Kokoro voices |
| `kokoroVoicesMap` | `ReactiveDictionary<string, KokoroVoiceInfo>` | `{}` | Kokoro voices by ID |

## Persistence

### Save to localStorage

```typescript
store.saveToLocalStorage();
```

Serializes all reactive properties to JSON and stores under the key `freetts-settings`.

### Load from localStorage

```typescript
store.loadFromLocalStorage();
```

Deserializes from `localStorage` and restores all properties. Uses **silent hydration** — no change events fire during restore.

### Check for saved settings

```typescript
store.hasSettings();  // Returns boolean
```

### Reset settings

```typescript
store.resetSettings();
```

Clears all properties to defaults and removes from `localStorage`.

### Serialization

```typescript
// Serialize to JSON string
const json = store.toJSONString();

// Deserialize from JSON
store.fromJSON(json);
```

## Subscriptions

Modules subscribe to reactive properties to react to changes:

```typescript
// Subscribe to a value change
store.isPlaying.subscribe((args: ReactEventArgs<boolean>) => {
    const isPlaying = args.data;
    // Update UI based on playback state
});

// Subscribe to list changes
store.voices.subscribe((args: ReactEventArgs<VoiceInfo[]>) => {
    const voices = args.data;
    // Update voice dropdown
});
```

## Architecture Benefits

1. **Single Source of Truth:** All state flows through `AppStore`, eliminating prop drilling.
2. **Automatic Synchronization:** Subscribers react to changes automatically.
3. **Persistent Settings:** Settings survive page reloads via `localStorage`.
4. **Type Safety:** TypeScript enums and generics ensure type correctness.
5. **Silent Hydration:** Loading saved state doesn't trigger unnecessary change events.
