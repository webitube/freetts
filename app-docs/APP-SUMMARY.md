## FreeTTS — Free Markdown Editor with Web-Based TTS

**What it is:** A lightweight, single-page vanilla JavaScript application that combines a Markdown editor with integrated Text-to-Speech. No downloads or logins required — it runs entirely in the browser.

**Live site:** `https://webitube.github.io/freetts/`

---

### Architecture

Three core source files:

| File | Purpose |
|---|---|
| **FreeTtsUtils.js** (~395 lines) | App orchestration — editor init, mode switching, TTS playback, theme management |
| **kokoro-player.js** (~475 lines) | Chunk-based audio player (`KokoroPlayer`) for neural TTS with mobile autoplay policy handling |
| **tts-worker.js** | Web Worker running `kokoro-js` (ONNX Runtime) for offline neural TTS |

### Key Features

- **Two editing modes:**
  - **Reveal Codes** — raw Markdown textarea with visible syntax
  - **Visual** — WYSIWYG editor via [Milkdown](https://milkdown.dev/) framework
- **Two TTS engines:**
  - **Web Speech API** — uses system voices, strips Markdown syntax, word-level highlighting
  - **Kokoro TTS** — neural TTS via ONNX Runtime Web (WebGPU/WASM), runs in a Web Worker, chunk-based audio with card UI, mobile autoplay policy handling (muted start + tap-to-play indicators)
- **Dark/light theme** persisted via `localStorage`
- **Responsive** design with Tailwind CSS
- **Selection-aware playback** — speak from cursor position or selected text

### Dependencies

- **Editor:** Milkdown 7.20 (GFM + CommonMark presets)
- **TTS:** `kokoro-js` 1.2, `onnx-runtime-web` 1.22, `phonemizer` 1.2
- **Build:** Vite 8 (for GitHub Pages deployment)
- **Styling:** Tailwind CSS (static), custom overrides

### Deployment

Built with `vite build` → outputs to dist. Deployed to **GitHub Pages** at `/freetts/` base path. CI/CD via GitHub Actions (documented in DEVOPS.md).

---

**In short:** A portable browser-based Markdown editor with powerful TTS capabilities — both standard voice and neural Kokoro TTS — targeting content creators who want to write and listen to their Markdown documents.