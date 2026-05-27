## FreeTTS — Free Markdown Editor with Web-Based TTS

**What it is:** A lightweight, TypeScript-powered single-page application that combines a Markdown editor with integrated Text-to-Speech. No downloads or logins required — it runs entirely in the browser. State management is handled by a centralized reactive store (`AppStore`) powered by ReactiveTypescript.

**Live site:** `https://webitube.github.io/freetts/`

---

### Architecture

Seventeen modular source files (16 `.ts` + 1 `.js` Web Worker) organized by concern:

| File | Purpose |
|---|---|
| **app-store.ts** | `AppStore` class — centralized reactive state (ReactiveTypescript), localStorage persistence, enums (`EngineEnum`, `StatusEnum`, `ThemeEnum`) |
| **app.ts** | Main entry point — initializes modules, DOMContentLoaded handler, callbacks, mode/engine switching, keyboard shortcuts |
| **app-utils.ts** | Helper functions — status messages, UI toggling, engine selection display |
| **editor-manager.ts** | `EditorManager` class — Milkdown init, lazy loading, mode switching, content sync via AppStore |
| **tts-controller.ts** | `TTSController` class — both TTS engines, selection-aware playback, word highlighting, pitch conversion |
| **kokoro-player.ts** | `KokoroPlayer` class — chunk orchestration, mobile autoplay, incremental rendering, scroll sync |
| **kokoro-audio-player.ts** | `AudioPlayer` class — audio element lifecycle, playback control |
| **kokoro-chunk-manager.ts** | `ChunkManager` class — chunk state delegation, mobile detection |
| **kokoro-chunk-renderer.ts** | `ChunkRenderer` class — chunk card creation, seek handling, audio elements |
| **kokoro-worker-communication.ts** | `WorkerCommunication` class — worker init, WebGPU detection, message routing |
| **tts-worker.js** | Web Worker running `kokoro-js` (ONNX Runtime) with streaming via `TextSplitterStream` |
| **settings-persistence.ts** | Thin wrapper around AppStore: save/load/reset settings, backward compatibility |
| **voice-manager.ts** | Voice loading: Web Speech (async), Kokoro, UI population, selection restoration |
| **ui-manager.ts** | UI initialization: theme toggle, help modal, clipboard/download, link interception |
| **highlighting-utils.ts** | Text utilities: Visual mode highlighting, cursor info, Markdown syntax cleaning |
| **debug-log.ts** | Logging utilities: formatted output, timers, array logging (conditional on debugMode) |
| **global-switches.ts** | Global state: `debugMode` flag with accessors (backed by AppStore) |

### Key Features

- **Two editing modes:**
  - **Reveal Codes** — raw Markdown textarea with visible syntax
  - **Visual** — WYSIWYG editor via [Milkdown](https://milkdown.dev/) framework
- **Two TTS engines:**
  - **Web Speech API** — uses system voices, strips Markdown syntax (`#`, `*`, `_`, `~`, `` ` ``, `[]()`, `|`), word-level highlighting, pitch control available on all platforms (non-Safari: `1 + pitch/12`; Safari omits pitch)
  - **Kokoro TTS** — neural TTS via ONNX Runtime Web (WebGPU/WASM), runs in a Web Worker with `TextSplitterStream` streaming, chunk-based audio with card UI, mobile autoplay policy handling (muted start + tap-to-play indicators), pitch control available on all platforms. **Kokoro is disabled on mobile** with an info indicator shown next to the engine selector. WebGPU uses `fp32` dtype, WASM uses `q8` dtype.
- **Reactive state management** — `AppStore` singleton ensures all modules stay synchronized without manual prop drilling
- **Dark/light theme** persisted via `localStorage` (also respects `prefers-color-scheme`)
- **Responsive** design with Tailwind CSS
- **Selection-aware playback** — speak from cursor position or selected text
- **Keyboard shortcut** — `Ctrl+Enter` (or `Cmd+Enter`) toggles playback
- **Settings persistence** — engine, voice, speed, pitch saved to localStorage under key `freetts-settings`; reset via "Reset Settings" button
- **Export features** — Copy to clipboard and Download as .md
- **Testing** — Vitest 4 with happy-dom (unit + integration tests)

### Module Dependencies

```
app.ts (entry point)
├── AppStore (app-store.ts) ← centralized reactive state
├── EditorManager (editor-manager.ts)
│   └── app-store.ts (currentMarkdown, isSourceMode)
├── TTSController (tts-controller.ts)
│   ├── highlighting-utils.ts (cleanMarkdown, highlightVisualWord)
│   ├── settings-persistence.ts (loadTTSSettings, saveTTSSettings)
│   └── app-store.ts (isSpeaking, engine)
├── KokoroPlayer (kokoro-player.ts)
│   ├── kokoro-audio-player.ts
│   ├── kokoro-chunk-manager.ts
│   ├── kokoro-chunk-renderer.ts
│   └── kokoro-worker-communication.ts
├── voice-manager.ts
├── ui-manager.ts
├── app-utils.ts
└── debug-log.ts

tts-worker.js (separate process)
└── kokoro-js (kokoro-js + onnxruntime-web)
```

### Dependencies

- **Language:** TypeScript (ES2020, strict mode, experimental decorators)
- **State:** ReactiveTypescript (reactive singleton store)
- **Editor:** Milkdown 7.20 (GFM + CommonMark presets)
- **TTS:** `kokoro-js` 1.2, `onnx-runtime-web` 1.22, `phonemizer` 1.2
- **Build:** Vite 8 (for GitHub Pages deployment)
- **Testing:** Vitest 4, happy-dom
- **Styling:** Tailwind CSS (static), custom overrides

### Deployment

Built with `vite build` → outputs to dist. Deployed to **GitHub Pages** at `/freetts/` base path. CI/CD via GitHub Actions (documented in DEVOPS.md).

---

**In short:** A portable browser-based Markdown editor with powerful TTS capabilities — both standard voice and neural Kokoro TTS — targeting content creators who want to write and listen to their Markdown documents.