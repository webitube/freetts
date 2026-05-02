# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start dev server
npx vite

# Build for production (outputs to dist/)
npx vite build

# Preview production build
npx vite preview
```

The base path in `vite.config.js` is set to `/dist/` for GitHub Pages deployment. Change this if deploying elsewhere.

## Architecture

FreeTTS is a vanilla JavaScript single-page app with no frontend framework. Application code lives in three files:

- **`FreeTtsUtils.js`** (~400 lines) — app orchestration: editor init, mode switching, TTS playback coordination, theme management
- **`src/kokoro-player.js`** (~340 lines) — chunk-based audio player class (`KokoroPlayer`) for the Kokoro TTS engine
- **`src/tts-worker.js`** — Web Worker that runs `kokoro-js` (ONNX Runtime) to generate audio off the main thread

### Editor Modes

The app has two editing modes toggled via tab buttons:

1. **Reveal Codes** — a `<textarea>` showing raw Markdown with syntax visible
2. **Visual** — a [Milkdown](https://milkdown.dev/) WYSIWYG editor instance (bundled via npm)

Mode switching syncs content between the textarea and Milkdown via its `replaceAll` command. Milkdown is initialized lazily on first switch to Visual mode. The app requires `npx vite` to run (ES module imports, Web Worker, ONNX Runtime).

### TTS Engines

The app supports two TTS engines, selected via dropdown:

#### 1. Web Speech API (`SpeechSynthesis`)
- Markdown syntax is stripped before speaking using `cleanMarkdown()` regex
- Word-level highlighting uses `SpeechSynthesisUtterance` boundary events (`e.name === 'word'`)
- In Reveal Codes mode, word highlighting is calculated by character offsets on the textarea (`setSelectionRange`)
- In Visual mode, a `TreeWalker` traverses DOM text nodes to find and highlight words
- TTS can start from a cursor position or text selection
- Pitch slider is supported (except Safari/Firefox)

#### 2. Kokoro TTS (`kokoro-js`)
- Neural TTS engine running via ONNX Runtime Web in a Web Worker (`src/tts-worker.js`)
- Worker auto-initializes on first use with top-level await, detects WebGPU vs WASM backend
- Model loaded from Hugging Face (`onnx-community/Kokoro-82M-v1.0-ONNX`) on first use
- Text is split into chunks and streamed back to the main thread as audio blobs
- **KokoroPlayer** renders each chunk as an independent `<audio>` element with controls
  - Cards append incrementally to the DOM — existing playback is never interrupted
  - Active chunk is highlighted with a blue border; styling updates are targeted (not full DOM rebuilds)
  - Auto-advance is driven by the `ended` event on each audio element
  - Click any chunk card to seek directly to it
  - Merged audio can be downloaded as WAV after generation completes
- Chunk-by-chunk text highlighting is synced via `_onChunkPlay` override

### State

Managed via simple module-level variables in `FreeTtsUtils.js` — no framework state management. Key globals:
- `currentMarkdown`, `milkdownEditor`, `isSourceMode`
- `isSpeaking`, `activeEngine` (`'webspeech'` | `'kokoro'`)
- `kokoroPlayer` (KokoroPlayer instance), `kokoroTextToSpeak`, `kokoroStartOffset`
- SpeechSynthesis voices array and pitch/speed slider values

### Styling

- `css/tailwind.min.css` — minified Tailwind (static, not processed)
- `css/FreeTTSStyles.css` — custom overrides, dark mode transitions, Milkdown editor theming
- Theme (light/dark) is toggled via a `data-theme` attribute on `<html>` and persisted in `localStorage`

### Deployment

GitHub Pages serves from the `dist/` folder via the `/dist/` base path. The `vite.config.js` sets this base so asset paths resolve correctly after build.

## DevOps

Detailed build, deployment, and CI/CD instructions are documented in [DEVOPS.md](./DEVOPS.md).
