# SettingsPersistence API

Thin wrapper around AppStore for settings persistence to localStorage.

## Functions

### hasSettings

```typescript
function hasSettings(): boolean
```

Check if settings exist in localStorage.

### saveIfNoSettings

```typescript
function saveIfNoSettings(elements?: Record<string, unknown>): void
```

Save settings if none exist yet. Syncs from DOM elements before saving.

### getSavedVoice

```typescript
function getSavedVoice(engine: string): string
```

Get the saved voice for a specific engine.

### setSavedVoice

```typescript
function setSavedVoice(engine: string, savedVoice: string): void
```

Set the saved voice for a specific engine.

### saveTTSSettings

```typescript
function saveTTSSettings(
    elements?: Record<string, unknown>,
    saveEngineOnly = false
): void
```

Save TTS settings to localStorage.

### loadTTSSettings

```typescript
function loadTTSSettings(): {
    engine: EngineEnum;
    voice: string;
    speed: number;
    pitch: number;
}
```

Load TTS settings from localStorage.

### resetTTSSettings

```typescript
function resetTTSSettings(): void
```

Reset all TTS settings to defaults.

## Storage Key

All settings are stored under the key `freetts-settings` in localStorage.
