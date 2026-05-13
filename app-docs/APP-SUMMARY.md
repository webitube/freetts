## FreeTTS — Free Markdown Editor with Web-Based TTS

**What it is:** A lightweight, single-page vanilla JavaScript application that combines a Markdown editor with integrated Text-to-Speech. No downloads or logins required — it runs entirely in the browser.

**Live site:** `https://webitube.github.io/freetts/`

---

### Architecture

Sixteen modular source files organized by concern:

| File | Lines | Purpose |
|---|---|---|
| **app.js** | 347 | Main entry point — initializes modules, DOMContentLoaded handler, callbacks, mode/engine switching, keyboard shortcuts |
| **editor-manager.js** | 100 | `EditorManager` class — Milkdown init, lazy loading, mode switching, content sync |
| **tts-controller.js** | 187 | `TTSController` class — both TTS engines, selection-aware playback, word highlighting, pitch conversion |
| **kokoro-player.js** | 530 | `KokoroPlayer` class — chunk orchestration, mobile autoplay, incremental rendering, scroll sync |
| **tts-worker.js** | 89 | Web Worker running `kokoro-js` (ONNX Runtime) with streaming via `TextSplitterStream` |
| **settings-persistence.js** | 202 | localStorage persistence: save/load/reset settings, voice management, backward compatibility |
| **voice-manager.js** | 169 | Voice loading: Web Speech (async), Kokoro, UI population, selection restoration |
| **ui-manager.js** | 104 | UI initialization: theme toggle, help modal, clipboard/download, link interception |
| **highlighting-utils.js** | 72 | Text utilities: Visual mode highlighting, cursor info, Markdown syntax cleaning |
| **debug-log.js** | 122 | Logging utilities: formatted output, timers, array logging |
| **kokoro-audio-player.js** | 97 | `AudioPlayer` class — audio element lifecycle, playback control |
| **kokoro-chunk-manager.js** | 54 | `ChunkManager` class — chunk state delegation, mobile detection |
| **kokoro-chunk-renderer.js** | 140 | `ChunkRenderer` class — chunk card creation, seek handling, audio elements |
| **kokoro-ui-manager.js** | 113 | `UIManager` class — status display, error handling, XSS prevention |
| **kokoro-worker-communication.js** | 177 | `WorkerCommunication` class — worker init, WebGPU detection, message routing |
| **global-switches.js** | 9 | Global state: `debugMode` flag with accessors |

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