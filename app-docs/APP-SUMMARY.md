## FreeTTS — Free Markdown Editor with Web-Based TTS

**What it is:** A lightweight, single-page vanilla JavaScript application that combines a Markdown editor with integrated Text-to-Speech. No downloads or logins required — it runs entirely in the browser.

**Live site:** `https://webitube.github.io/freetts/`

---

### Architecture

Three core source files:

| File | Purpose |
|---|---|
| **FreeTtsUtils.js** (~432 lines) | App orchestration — editor init, mode switching, TTS playback, theme management, settings persistence |
| **kokoro-player.js** (~441 lines) | Chunk-based audio player (`KokoroPlayer`) for neural TTS with mobile autoplay policy handling, incremental card rendering |
| **tts-worker.js** (~73 lines) | Web Worker running `kokoro-js` (ONNX Runtime) with `TextSplitterStream` for streaming TTS generation |

### Key Features

- **Two editing modes:**
  - **Reveal Codes** — raw Markdown textarea with visible syntax
  - **Visual** — WYSIWYG editor via [Milkdown](https://milkdown.dev/) framework
- **Two TTS engines:**
  - **Web Speech API** — uses system voices, strips Markdown syntax (`#`, `*`, `_`, `~`, `` ` ``, `[]()`, `|`), word-level highlighting, pitch control available on all platforms (non-Safari: `1 + pitch/12`; Safari omits pitch)
  - **Kokoro TTS** — neural TTS via ONNX Runtime Web (WebGPU/WASM), runs in a Web Worker with `TextSplitterStream` streaming, chunk-based audio with card UI, mobile autoplay policy handling (muted start + tap-to-play indicators), pitch control available on all platforms. **Kokoro is disabled on mobile** with an info indicator shown next to the engine selector. WebGPU uses `fp32` dtype, WASM uses `q8` dtype.
- **Dark/light theme** persisted via `localStorage`
- **Responsive** design with Tailwind CSS
- **Selection-aware playback** — speak from cursor position or selected text
- **Keyboard shortcut** — `Ctrl+Enter` (or `Cmd+Enter`) toggles playback
- **Settings persistence** — engine, voice, speed, pitch saved to localStorage under key `freetts-settings`; reset via "Reset Settings" button
- **Dark/light theme** persisted via `localStorage` (also respects `prefers-color-scheme`)

### Dependencies

- **Editor:** Milkdown 7.20 (GFM + CommonMark presets)
- **TTS:** `kokoro-js` 1.2, `onnx-runtime-web` 1.22, `phonemizer` 1.2
- **Build:** Vite 8 (for GitHub Pages deployment)
- **Styling:** Tailwind CSS (static), custom overrides

### Deployment

Built with `vite build` → outputs to dist. Deployed to **GitHub Pages** at `/freetts/` base path. CI/CD via GitHub Actions (documented in DEVOPS.md).

---

**In short:** A portable browser-based Markdown editor with powerful TTS capabilities — both standard voice and neural Kokoro TTS — targeting content creators who want to write and listen to their Markdown documents.