# Agent Instructions for FreeTTS

## Core Architecture
- **Orchestration:** `src/app.js` manages the lifecycle and module coordination.
- **Editor:** Dual-mode editing. `EditorManager` handles switching between "Source" (raw Markdown textarea) and "Visual" (Milkdown WYSIWYG).
- **TTS Engine:** `TTSController` orchestrates two engines:
  - **Web Speech API:** Native browser-based.
  - **Kokoro TTS:** Neural engine using ONNX Runtime (WebGPU/WASM).
- **State & Persistence:** `localStorage` is used for settings (voice, speed, pitch, engine preference) via `src/settings-persistence.js`.

## Development Commands
- `npm run dev`: Start development server (Vite).
- `npm run build`: Build production assets.
- `npm run test`: Run all tests (Vitest).
- `npm run test:coverage`: Run tests with coverage report.
- `npm run test:watch`: Run tests in watch mode.

## Testing Guide
- **Framework:** Vitest with `happy-dom`.
- **Unit Tests:** Located in `tests/unit/`.
- **Integration Tests:** Located in `tests/integration/`.
- **Mocks:** `tests/setup.js` provides mocks for `localStorage`, `speechSynthesis`, and other DOM APIs.
- **Running Specific Tests:**
  - `npx vitest run tests/unit/<filename>.test.js`
  - `npx vitest run -t "<pattern>"` (runs tests matching a name pattern).

## TTS & Kokoro Specifics (Critical)
- **Kokoro Model Download:** The first use of Kokoro triggers a large model download (326MB for WebGPU, 86MB for WASM) to IndexedDB.
- **Mobile Constraint:** **Kokoro TTS is disabled on mobile devices** due to ONNX Runtime constraints.
- **Browser Compatibility:** WebGPU is Chromium-only; others fallback to WASM.
- **Playback Logic:** Kokoro uses a chunk-based playback strategy via a Web Worker to ensure smooth audio and word-level highlighting.

## UI & Shortcuts
- **Keyboard Shortcut:** `Ctrl+Enter` / `Cmd+Enter` toggles TTS playback.
- **Theme:** Persisted via `localStorage`.
- **Mode Switching:** `EditorManager.switchToVisual()` and `EditorManager.switchToSource()`.
