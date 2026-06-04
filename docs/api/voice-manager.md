# VoiceManager API

Voice loading and management for TTS engines.

## Interfaces

### VoiceInfo

```typescript
interface VoiceInfo {
    name: string;
    lang: string;
}
```

### KokoroVoiceInfo

```typescript
interface KokoroVoiceInfo {
    name: string;
    language: string;
    gender: string;
}
```

## Functions

### loadWebSpeechVoices

```typescript
function loadWebSpeechVoices(
    elements: Record<string, unknown>,
    synth: SpeechSynthesis,
    savedVoice?: string
): Promise<VoiceInfo[]>
```

Load Web Speech voices and populate voice selector.

### loadKokoroVoices

```typescript
function loadKokoroVoices(
    elements: Record<string, unknown>,
    savedVoice?: string
): Promise<KokoroVoiceInfo[]>
```

Load Kokoro voices and populate voice selector.

### updatePitchWarning

```typescript
function updatePitchWarning(pitchSlider: HTMLInputElement | null): void
```

Update pitch slider warning when value is outside normal range (0.5–1.5).

## Voice Selection Flow

1. Load available voices from engine
2. Resolve saved voice by name or index
3. Populate dropdown with options
4. Set saved voice as selected (or first available)
5. Save settings

## DOM Elements

| Element ID | Purpose |
|------------|---------|
| `engine-select` | TTS engine dropdown |
| `voice-select` | Voice selection dropdown |
| `speed-slider` | Playback speed slider |
| `pitch-slider` | Voice pitch slider |
