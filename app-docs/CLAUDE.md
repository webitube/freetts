# CLAUDE.md

This file provides guidance to AI coding agents when working with code in this repository.

## Project Overview

FreeTTS is a **TypeScript** single-page application (no frontend framework) that combines a Markdown editor with integrated Text-to-Speech. The codebase uses Vite for building, Milkdown for the WYSIWYG editor, and a reactive state management system (`AppStore`) powered by ReactiveTypescript.

## Commands

```bash
# Start dev server (Vite with HMR)
npm run dev

# Build for production (outputs to dist/)
npm run build

# Preview production build
npm run preview

# Run all tests (Vitest)
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

The base path in `vite.config.js` is set to `/freetts/` for GitHub Pages deployment. Change this if deploying elsewhere (e.g., `/dist/` or `/` for a custom domain).

## Architecture

FreeTTS is a TypeScript single-page app with no frontend framework. Application code lives in **17 modular files** in `src/` (16 `.ts` files + 1 `.js` Web Worker):

### State Management (New)

- **`src/app-store.ts`** — `AppStore` class: Centralized reactive state singleton using ReactiveTypescript. Manages all application state: TTS settings (engine, speed, pitch, saved voices), playback state (isSpeaking, currentChunkIndex), editor state (isSourceMode, currentMarkdown), UI state (theme, debugMode, statusMessage, activeDevice), and voice state. Provides `saveToLocalStorage()`, `loadFromLocalStorage()`, `resetToDefaults()`, and `getSavedVoice()` methods. Enums: `EngineEnum`, `StatusEnum`, `ThemeEnum`.

### Entry Point

- **`src/app.ts`** — Main entry point: initializes all modules (`EditorManager`, `TTSController`, `KokoroPlayer`), handles DOMContentLoaded, sets up callbacks for status updates and speaking state sync, manages editor mode switching, TTS engine selection, voice loading, keyboard shortcuts (Ctrl+Enter), and Kokoro chunk highlighting sync. Reads initial content from `DefaultText.md`.

### Editor Module

- **`src/editor-manager.ts`** — `EditorManager` class: Milkdown editor initialization, lazy loading, mode switching between Reveal Codes (textarea) and Visual (WYSIWYG), markdown content synchronization via `AppStore.currentMarkdown`.

### TTS Controller Module

- **`src/tts-controller.ts`** — `TTSController` class: main TTS playback logic for both Web Speech API and Kokoro engines, selection-aware playback, word-level highlighting sync, pitch conversion (non-Safari: `1 + pitch/12`), state management via `AppStore` (`isSpeaking`, `engine`).

### Kokoro TTS Module

- **`src/kokoro-player.ts`** — `KokoroPlayer` class: chunk-based audio playback orchestration, mobile autoplay policy handling (muted start + tap-to-play indicators), incremental card rendering and DOM updates, merged audio download, scroll synchronization, active chunk highlighting. Composed of `WorkerCommunication`, `AudioPlayer`, `ChunkManager`, and `ChunkRenderer` sub-modules.
- **`src/kokoro-audio-player.ts`** — `AudioPlayer` class: chunk audio element lifecycle management, playback control, error handling.
- **`src/kokoro-chunk-manager.ts`** — `ChunkManager` class: chunk state delegation and mobile browser detection.
- **`src/kokoro-chunk-renderer.ts`** — `ChunkRenderer` class: chunk card DOM creation, seek-by-click handling, audio element creation with WAV format metadata for mobile compatibility.
- **`src/kokoro-worker-communication.ts`** — `WorkerCommunication` class: Web Worker initialization, WebGPU detection, message handling (init, stream chunks, completion, errors), device selection (WebGPU `fp32` vs WASM `q8`).

### Web Worker

- **`src/tts-worker.js`** — Web Worker (remains `.js` for Worker compatibility) that runs `kokoro-js` (ONNX Runtime) with `TextSplitterStream` for streaming TTS generation, handles device backend selection, chunk streaming, and merged audio assembly.

### Shared Utilities & Persistence

- **`src/settings-persistence.ts`** — Thin wrapper around `AppStore` for backward compatibility: `saveTTSSettings()`, `loadTTSSettings()`, `resetTTSSettings()`, `getSavedVoice()`, `setSavedVoice()`, `hasSettings()`, `saveIfNoSettings()`. All persistence logic now lives in `AppStore.saveToLocalStorage()` / `loadFromLocalStorage()`.
- **`src/voice-manager.ts`** — Voice loading and management: `loadWebSpeechVoices()` (async, handles `voiceschanged` event with 5s timeout), `loadKokoroVoices()` (syncs from worker), `populateVoiceSelect()` (UI population with voice selection restoration), `updatePitchWarning()`.
- **`src/ui-manager.ts`** — UI initialization functions: `initThemeToggle()` (dark/light mode persistence via AppStore), `initHelpModal()` (help modal controls), `initClipboardAndDownload()` (copy and download .md), `setUIState()` (play/stop button sync), `initLinkInterceptor()` (visual mode link handling).
- **`src/app-utils.ts`** — Helper functions: `updateStatusMsg()`, `resetStatusAfterDelay()`, `toggleHidden()`, `capitalizeMsg()`, `getSelectedEngine()`, `updateSelectedEngine()`.
- **`src/highlighting-utils.ts`** — Text processing utilities: `highlightVisualWord()` (TreeWalker-based DOM text highlighting), `getVisualCursorInfo()` (cursor position and text extraction), `cleanMarkdown()` (regex-based syntax stripping: `#*_~` backticks, link syntax, pipes).
- **`src/debug-log.ts`** — Debug logging utilities: `debugLog()`, `debugLogEnd()`, `debugWarn()`, `debugWarnEnd()`, `debugError()`, `debugErrorEnd()`, `debugLogArray()`, `repeatChar()` — formatted console output with optional timers. Conditional on `AppStore.debugMode`.
- **`src/global-switches.ts`** — Global state: `debugMode` flag with `getDebugMode()`/`setDebugMode()` accessors, backed by `AppStore.debugMode`.

### Editor Modes

The app has two editing modes toggled via tab buttons, managed by `EditorManager` in `src/editor-manager.ts`:

1. **Reveal Codes** — a `<textarea>` showing raw Markdown with syntax visible
2. **Visual** — a [Milkdown](https://milkdown.dev/) WYSIWYG editor instance (bundled via npm)

Mode switching syncs content between the textarea and Milkdown via its `replaceAll` command. Milkdown is initialized lazily on first switch to Visual mode. Content is synced through `AppStore.currentMarkdown`. The app requires `npx vite` to run (ES module imports, Web Worker, ONNX Runtime).

### TTS Engines

The app supports two TTS engines, selected via dropdown. TTS logic is managed by `TTSController` in `src/tts-controller.ts`:

#### 1. Web Speech API (`SpeechSynthesis`)
- Markdown syntax is stripped before speaking using `cleanMarkdown()` regex (removes `#`, `*`, `_`, `~`, `` ` ``, link syntax `[]()`, and `|`) — defined in `src/highlighting-utils.ts`
- Word-level highlighting uses `SpeechSynthesisUtterance` boundary events (`e.name === 'word'`)
- In Reveal Codes mode, word highlighting is calculated by character offsets on the textarea (`setSelectionRange`)
- In Visual mode, a `TreeWalker` traverses DOM text nodes to find and highlight words via `highlightVisualWord()` from `src/highlighting-utils.ts`
- Pitch conversion: `1 + parseInt(pitchSlider.value) / 12` (non-Safari); Safari omits pitch entirely
- TTS can start from a cursor position or text selection
- **Pitch slider is available on all platforms and engines**, range -2 to +2, step 0.5. Safari Web Speech omits pitch (`if (!isSafari)`).

#### 2. Kokoro TTS (`kokoro-js`)
- Neural TTS engine running via ONNX Runtime Web in a Web Worker (`src/tts-worker.js`)
- **WebGPU detection**: Main thread detects WebGPU availability (not available in worker context) and passes result to worker via `{ status: 'init', useWebGPU }` message
- **Mobile Kokoro disable**: When Kokoro engine is selected on mobile (`isMobile`), the engine dropdown disables the Kokoro option and shows a "Kokoro disabled on mobile" info indicator next to the selector
- Model loaded from Hugging Face (`onnx-community/Kokoro-82M-v1.0-ONNX`) on first use, cached in browser IndexedDB
- **Download sizes**: WebGPU uses `model.onnx` (326 MB, fp32), WASM uses `model_q8f16.onnx` (86 MB, q8 quantized)
- **Browser compatibility**: WebGPU only available in Chromium browsers (Chrome, Edge). Firefox and Safari fall back to the smaller WASM model (86 MB)
- **First-use download**: A stable internet connection is required for the initial model download; subsequent uses are instant from cache
- Text is split into chunks using `TextSplitterStream` and streamed back to the main thread as WAV audio blobs
- **Device selection**: WebGPU uses `fp32` dtype, WASM uses `q8` dtype
- **KokoroPlayer** (`src/kokoro-player.ts`) renders each chunk as an independent `<audio>` element with controls
  - Cards append incrementally to the DOM via `_appendChunkCard()` — existing playback is never interrupted
  - Active chunk is highlighted with a blue border and blue background; styling updates are targeted via `_setCardActive()` (not full DOM rebuilds)
  - Auto-advance is driven by the `ended` event on each audio element
  - Click any chunk card to seek directly to it (pauses all audio, plays the clicked chunk)
  - Merged audio can be downloaded as WAV via `downloadMerged()` after generation completes
  - Mobile autoplay policy handling: detects mobile browsers via user-agent/touch points, starts audio muted, shows "▶ Tap to play" indicators, unmutes when ready
  - Fallback mechanisms: `canplay` event listener (fires earlier than `canplaythrough`), 2-second timeout fallback, retry logic with 100ms delay on play failures
  - Graceful error handling for `NotAllowedError` (autoplay blocked) with `_handleAutoplayBlocked()` method
  - Mobile behavior: shows "Tap to play" indicator on auto-advance; desktop auto-plays with 300ms delay
- Chunk-by-chunk text highlighting is synced via `_onChunkPlay` callback (set in `src/app.ts`)

### Mobile Browser Autoplay Handling

Mobile browsers (especially iOS Safari) enforce strict autoplay policies that block programmatic audio playback without user gestures. KokoroPlayer implements a comprehensive strategy to handle this:

1. **Mobile detection** (`this.isMobile`): Tests user-agent string for mobile platforms or checks `navigator.maxTouchPoints > 2`
2. **Muted start**: Audio starts muted to bypass autoplay restrictions, unmutes when `canplay` event fires
3. **Mobile-specific behavior**:
   - Desktop: auto-plays with 100ms delay, auto-advances chunks with 300ms delay
   - Mobile: shows "▶ Tap to play" indicator instead of auto-playing, requires user tap to unmute and play
4. **Event listeners**: Uses both `canplay` (earlier, more reliable) and `canplaythrough` events
5. **Timeout fallback**: 2-second timeout for cases where events don't fire
6. **Retry logic**: 100ms delay retry on play failures (except `NotAllowedError` which shows UI indicator)

### Reactive State (AppStore)

All application state is now managed by the `AppStore` singleton (`src/app-store.ts`), powered by ReactiveTypescript:

**TTS Settings:**
- `engine` (`EngineEnum.WebSpeech` | `EngineEnum.Kokoro`)
- `speed` (number, default: 1)
- `pitch` (number, default: 0)
- `savedVoices` (dictionary: engine → voice name)

**Playback State:**
- `isSpeaking` (boolean)
- `kokoroStatus` (`StatusEnum`)
- `currentChunkIndex` (number)

**Editor State:**
- `isSourceMode` (boolean)
- `currentMarkdown` (string)

**UI State:**
- `theme` (`ThemeEnum.Light` | `ThemeEnum.Dark`)
- `debugMode` (boolean)
- `statusMessage` (string)
- `activeDevice` (string: 'webgpu' | 'wasm')

**Voice State:**
- `webSpeechVoicesLoaded` / `kokoroVoicesLoaded` (boolean)
- `webSpeechVoices` (ReactiveList)
- `kokoroVoices` (ReactiveDictionary)

**Persistence:**
- `saveToLocalStorage()` / `loadFromLocalStorage()` — full serialization via ReactiveSerializer
- `resetToDefaults()` — clears localStorage and resets all reactive values
- `hasSettings()` — check if settings exist

### Settings Persistence

TTS settings (engine, voice, speed, pitch) are saved to localStorage under key `freetts-settings`. The `src/settings-persistence.ts` module provides a thin backward-compatible wrapper around `AppStore`. All persistence logic now lives in `AppStore.saveToLocalStorage()` / `loadFromLocalStorage()`.

### Styling

- `css/tailwind.min.css` — minified Tailwind (static, not processed)
- `css/FreeTTSStyles.css` — custom overrides, dark mode transitions, Milkdown editor theming
- Theme (light/dark) is toggled via a `dark` class on `<html>` and persisted in `localStorage` through `AppStore.theme`. Theme toggle is initialized by `initThemeToggle()` in `src/ui-manager.ts`.

### Testing

- **Framework:** Vitest 4 with happy-dom
- **Unit tests:** `tests/unit/` — 10 test files covering individual modules
- **Integration tests:** `tests/integration/` — 2 test files for cross-module flows
- **Mocks:** `tests/setup.js` provides mocks for `localStorage`, `speechSynthesis`, and other DOM APIs
- **Commands:** `npm test`, `npm run test:coverage`, `npm run test:watch`

### Deployment

GitHub Pages serves at `https://webitube.github.io/freetts/`. The `vite.config.js` sets `base: '/freetts/'` so asset paths resolve correctly after build.

## DevOps

Detailed build, deployment, and CI/CD instructions are documented in [DEVOPS.md](./DEVOPS.md).
