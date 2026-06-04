# AppStore API

The `AppStore` singleton manages all application state using ReactiveTypescript decorators.

## Overview

```typescript
class AppStore {
    static instance: AppStore;
    
    // TTS Settings
    @reactiveValue engine: ReactiveValue<EngineEnum>
    @reactiveValue voice: ReactiveValue<string>
    @reactiveValue speed: ReactiveValue<number>
    @reactiveValue pitch: ReactiveValue<number>
    @reactiveDict savedVoices: ReactiveDictionary<string, string>
    
    // Playback State
    @reactiveValue isPlaying: ReactiveValue<boolean>
    @reactiveValue isSpeaking: ReactiveValue<boolean>
    @reactiveValue isStopped: ReactiveValue<boolean>
    @reactiveValue status: ReactiveValue<StatusEnum>
    @reactiveValue activeDevice: ReactiveValue<string>
    
    // Editor State
    @reactiveValue currentMarkdown: ReactiveValue<string>
    @reactiveValue isSourceMode: ReactiveValue<boolean>
    
    // UI State
    @reactiveValue theme: ReactiveValue<ThemeEnum>
    @reactiveValue debugMode: ReactiveValue<boolean>
    
    // Voice Data
    @reactiveList voices: ReactiveList<VoiceInfo>
    @reactiveList kokoroVoices: ReactiveList<KokoroVoiceInfo>
    @reactiveDict kokoroVoicesMap: ReactiveDictionary<string, KokoroVoiceInfo>
}
```

## Enums

### EngineEnum

| Value | Description |
|-------|-------------|
| `Unknown` | Uninitialized engine |
| `WebSpeech` | Web Speech API |
| `Kokoro` | Kokoro neural TTS |

### StatusEnum

| Value | Description |
|-------|-------------|
| `Unknown` | Uninitialized |
| `Loading` | Model loading |
| `Ready` | Ready to generate |
| `Generating` | Audio generation in progress |
| `Error` | Error occurred |

### ThemeEnum

| Value | Description |
|-------|-------------|
| `Unknown` | Uninitialized |
| `Light` | Light theme |
| `Dark` | Dark theme |

## Persistence Methods

| Method | Description |
|--------|-------------|
| `saveToLocalStorage()` | Serialize all state to localStorage |
| `loadFromLocalStorage()` | Restore state from localStorage |
| `hasSettings()` | Check if settings exist |
| `resetSettings()` | Clear all state to defaults |
| `toJSONString()` | Serialize to JSON string |
| `fromJSON(json)` | Deserialize from JSON string |

## Subscriptions

```typescript
store.isPlaying.subscribe((args: ReactEventArgs<boolean>) => {
    console.log('Playing:', args.data);
});
```

## Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `STORAGE_KEY` | `'freetts-settings'` | localStorage key |
