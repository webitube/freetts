## FreeTTS — Free Markdown Editor with Web-Based TTS

**What it is:** A lightweight, single-page vanilla JavaScript application that combines a Markdown editor with integrated Text-to-Speech. No downloads or logins required — it runs entirely in the browser.

**Live site:** `https://webitube.github.io/freetts/`

---

### Architecture

Sixteen modular source files organized by concern:

| File | Lines | Purpose |
|---|---|---|
| **app.js** | ~272 | Main entry point — initializes all modules, handles DOMContentLoaded, sets up KokoroPlayer callbacks |
| **editor-manager.js** | ~104 | `EditorManager` class — Milkdown editor init, mode switching between Reveal Codes (textarea) and Visual (WYSIWYG) |
| **tts-controller.js** | ~177 | `TTSController` class — TTS playback logic for both engines, word highlighting, pitch conversion, state management |
| **kokoro-player.js** | ~347 | `KokoroPlayer` class — chunk-based audio playback with mobile autoplay handling, incremental card rendering, merged audio download |
| **tts-worker.js** | ~73 | Web Worker running `kokoro-js` (ONNX Runtime) with `TextSplitterStream` for streaming TTS generation |
| **settings-persistence.js** | ~154 | `saveTTSSettings()`, `loadTTSSettings()`, `resetTTSSettings()` — localStorage persistence under `freetts-settings` |
| **voice-manager.js** | ~98 | `loadWebSpeechVoices()`, `loadKokoroVoices()`, `updatePitchWarning()` — voice loading and Kokoro voice sync |
| **ui-manager.js** | ~90 | `initThemeToggle()`, `initHelpModal()`, `initClipboardAndDownload()`, `setUIState()` — UI initialization |
| **highlighting-utils.js** | ~72 | `cleanMarkdown()`, `highlightVisualWord()`, `getVisualCursorInfo()` — text cleaning and word highlighting |
| **debug-log.js** | ~95 | `debugLog()`, `debugWarn()`, `debugError()` — structured debug logging with start/end markers |
| **kokoro-audio-player.js** | ~78 | Audio playback control helpers for Kokoro chunks |
| **kokoro-chunk-manager.js** | ~43 | Chunk state management for Kokoro audio generation |
| **kokoro-chunk-renderer.js** | ~113 | Chunk card DOM rendering with incremental append |
| **kokoro-ui-manager.js** | ~87 | Kokoro-specific UI elements (download button, status display) |
| **kokoro-worker-communication.js** | ~150 | Worker message handling (init, text, audio, status, errors) |
| **global-switches.js** | ~9 | Global `debugMode` flag with `getDebugMode()`/`setDebugMode()` |

### Key Features

- **Two editing modes:**
  - **Reveal Codes** — raw Markdown textarea with visible syntax
  - **Visual** — WYSIWYG editor via [Milkdown](https://milkdown.dev/) framework
- **Two TTS engines:**
  - **Web Speech API** — uses system voices, strips Markdown syntax (`#`, `*`, `_`, `~`, `` ` ``, `[]()`, `|`), word-level highlighting, pitch control available on all platforms (non-Safari: `1 + pitch/12`; Safari omits pitch)
  - **Kokoro TTS** — neural TTS via ONNX Runtime Web (WebGPU/WASM), runs in a Web Worker with `TextSplitterStream` streaming, chunk-based audio with card UI, mobile autoplay policy handling (muted start + tap-to-play indicators), pitch control available on all platforms. **Kokoro is disabled on mobile** with an info indicator shown next to the engine selector. WebGPU uses `fp32` dtype, WASM uses `q8` dtype.
- **Dark/light theme** persisted via `localStorage` (also respects `prefers-color-scheme`)
- **Responsive** design with Tailwind CSS
- **Selection-aware playback** — speak from cursor position or selected text
- **Keyboard shortcut** — `Ctrl+Enter` (or `Cmd+Enter`) toggles playback
- **Settings persistence** — engine, voice, speed, pitch saved to localStorage under key `freetts-settings`; reset via "Reset Settings" button
- **Export features** — Copy to clipboard and Download as .md

### Module Dependencies

```
app.js (entry point)
├── EditorManager (editor-manager.js)
├── TTSController (tts-controller.js)
│   ├── highlighting-utils.js (cleanMarkdown, highlightVisualWord)
│   └── settings-persistence.js (loadTTSSettings, saveTTSSettings)
├── KokoroPlayer (kokoro-player.js)
│   ├── kokoro-audio-player.js
│   ├── kokoro-chunk-manager.js
│   ├── kokoro-chunk-renderer.js
│   ├── kokoro-ui-manager.js
│   └── kokoro-worker-communication.js
├── voice-manager.js
├── ui-manager.js
└── debug-log.js

tts-worker.js (separate process)
└── kokoro-js (kokoro-js + onnxruntime-web)
```

### Dependencies

- **Editor:** Milkdown 7.20 (GFM + CommonMark presets)
- **TTS:** `kokoro-js` 1.2, `onnx-runtime-web` 1.22, `phonemizer` 1.2
- **Build:** Vite 8 (for GitHub Pages deployment)
- **Styling:** Tailwind CSS (static), custom overrides

### Deployment

Built with `vite build` → outputs to dist. Deployed to **GitHub Pages** at `/freetts/` base path. CI/CD via GitHub Actions (documented in DEVOPS.md).

---

**In short:** A portable browser-based Markdown editor with powerful TTS capabilities — both standard voice and neural Kokoro TTS — targeting content creators who want to write and listen to their Markdown documents.