# TTSController API

The `TTSController` class orchestrates playback across both TTS engines (Web Speech API and Kokoro).

## Constructor

```typescript
constructor(
    elements: Record<string, unknown>,
    editorManager: EditorManager,
    kokoroPlayer: KokoroPlayer,
    highlightVisualWord: (offset: number, length: number, el: HTMLElement) => void,
    getVisualCursorInfo: (el: HTMLElement) => { text: string; offset: number },
    voices: any[],
    isSafari: boolean,
    isSpeakingCallback?: (isSpeaking: boolean) => void,
)
```

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `elements` | `Record<string, unknown>` | DOM elements map |
| `editorManager` | `EditorManager` | Editor mode manager |
| `kokoroPlayer` | `KokoroPlayer` | Kokoro player instance |
| `voices` | `any[]` | Available Web Speech voices |
| `isSafari` | `boolean` | Safari detection flag |
| `kokoroTextToSpeak` | `string` | Current Kokoro text |
| `kokoroStartOffset` | `number` | Kokoro start offset |
| `speechOffsetStart` | `number` | Speech offset start |

## Methods

| Method | Description |
|--------|-------------|
| `togglePlayback(stopWebSpeech, stopKokoro, loadTTSSettings, statusCallback)` | Toggle TTS playback |
| `startWebSpeechPlayback(text, voice, speed, pitch, startOffset, statusCallback)` | Start Web Speech playback |
| `stopWebSpeechPlayback()` | Stop Web Speech playback |
| `startKokoroPlayback(text, voice, speed, startOffset, statusCallback)` | Start Kokoro playback |
| `stopKokoroPlayback()` | Stop Kokoro playback |
| `cleanMarkdown(text)` | Strip Markdown syntax |

## Playback Flow

```typescript
togglePlayback() {
    const engine = AppStore.instance.engine.get();
    if (engine === EngineEnum.WebSpeech) {
        startWebSpeechPlayback(...);
    } else if (engine === EngineEnum.Kokoro) {
        startKokoroPlayback(...);
    }
}
```
