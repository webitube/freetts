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

The base path in `vite.config.js` is set to `/freetts/` for GitHub Pages deployment. Change this if deploying elsewhere (e.g., `/dist/` or `/` for a custom domain).

## Architecture

FreeTTS is a vanilla JavaScript single-page app with no frontend framework. Application code lives in 16 modular files in `src/`:

### Entry Point

- **`src/app.js`** (347 lines) — Main entry point: initializes all modules (`EditorManager`, `TTSController`, `KokoroPlayer`), handles DOMContentLoaded, sets up callbacks for status updates and speaking state sync, manages editor mode switching, TTS engine selection, voice loading, and keyboard shortcuts (Ctrl+Enter)

### Editor Module

- **`src/editor-manager.js`** (100 lines) — `EditorManager` class: Milkdown editor initialization, lazy loading, mode switching between Reveal Codes (textarea) and Visual (WYSIWYG), markdown content synchronization

### TTS Controller Module

- **`src/tts-controller.js`** (187 lines) — `TTSController` class: main TTS playback logic for both Web Speech API and Kokoro engines, selection-aware playback, word-level highlighting sync, pitch conversion (non-Safari: `1 + pitch/12`), state management (`isSpeaking`, `activeEngine`, `kokoroTextToSpeak`)

### Kokoro TTS Module

- **`src/kokoro-player.js`** (530 lines) — `KokoroPlayer` class: chunk-based audio playback orchestration, mobile autoplay policy handling (muted start + tap-to-play indicators), incremental card rendering and DOM updates, merged audio download, scroll synchronization, active chunk highlighting
- **`src/kokoro-audio-player.js`** (97 lines) — `AudioPlayer` class: chunk audio element lifecycle management, playback control, error handling
- **`src/kokoro-chunk-manager.js`** (54 lines) — `ChunkManager` class: chunk state delegation and mobile browser detection
- **`src/kokoro-chunk-renderer.js`** (140 lines) — `ChunkRenderer` class: chunk card DOM creation, seek-by-click handling, audio element creation with WAV format metadata for mobile compatibility
- **`src/kokoro-ui-manager.js`** (113 lines) — `UIManager` class: status display, error messages, chunk card management, HTML escaping for XSS prevention
- **`src/kokoro-worker-communication.js`** (177 lines) — `WorkerCommunication` class: Web Worker initialization, WebGPU detection, message handling (init, stream chunks, completion, errors), device selection (WebGPU `fp32` vs WASM `q8`)

### Web Worker

- **`src/tts-worker.js`** (89 lines) — Web Worker that runs `kokoro-js` (ONNX Runtime) with `TextSplitterStream` for streaming TTS generation, handles device backend selection, chunk streaming, and merged audio assembly

### Shared Utilities & Persistence

- **`src/settings-persistence.js`** (202 lines) — localStorage persistence module: `saveTTSSettings()`, `loadTTSSettings()`, `resetTTSSettings()`, `getSavedVoice()`, `setSavedVoice()`, `hasSettings()`, `saveIfNoSettings()` — persists engine, voice, speed, and pitch under key `freetts-settings` with backward compatibility for old voice index format
- **`src/voice-manager.js`** (169 lines) — Voice loading and management: `loadWebSpeechVoices()` (async, handles `voiceschanged` event with 5s timeout), `loadKokoroVoices()` (syncs from worker), `populateVoiceSelect()` (UI population with voice selection restoration), `updatePitchWarning()` — voice name resolution with backward compatibility
- **`src/ui-manager.js`** (104 lines) — UI initialization functions: `initThemeToggle()` (dark/light mode persistence), `initHelpModal()` (help modal controls), `initClipboardAndDownload()` (copy and download .md), `setUIState()` (play/stop button sync), `initLinkInterceptor()` (visual mode link handling)
- **`src/highlighting-utils.js`** (72 lines) — Text processing utilities: `highlightVisualWord()` (TreeWalker-based DOM text highlighting), `getVisualCursorInfo()` (cursor position and text extraction), `cleanMarkdown()` (regex-based syntax stripping: `#*_~` backticks, link syntax, pipes)
- **`src/debug-log.js`** (122 lines) — Debug logging utilities: `debugLog()`, `debugLogEnd()`, `debugWarn()`, `debugWarnEnd()`, `debugError()`, `debugErrorEnd()`, `debugLogArray()`, `repeatChar()` — formatted console output with optional timers
- **`src/global-switches.js`** (9 lines) — Global state: `debugMode` flag with `getDebugMode()`/`setDebugMode()` accessors

### Editor Modes

The app has two editing modes toggled via tab buttons, managed by `EditorManager` in `src/editor-manager.js`:

1. **Reveal Codes** — a `<textarea>` showing raw Markdown with syntax visible
2. **Visual** — a [Milkdown](https://milkdown.dev/) WYSIWYG editor instance (bundled via npm)

Mode switching syncs content between the textarea and Milkdown via its `replaceAll` command. Milkdown is initialized lazily on first switch to Visual mode. The app requires `npx vite` to run (ES module imports, Web Worker, ONNX Runtime).

### TTS Engines

The app supports two TTS engines, selected via dropdown. TTS logic is managed by `TTSController` in `src/tts-controller.js`:

#### 1. Web Speech API (`SpeechSynthesis`)
- Markdown syntax is stripped before speaking using `cleanMarkdown()` regex (removes `#`, `*`, `_`, `~`, `` ` ``, link syntax `[]()`, and `|`) — defined in `src/highlighting-utils.js`
- Word-level highlighting uses `SpeechSynthesisUtterance` boundary events (`e.name === 'word'`)
- In Reveal Codes mode, word highlighting is calculated by character offsets on the textarea (`setSelectionRange`)
- In Visual mode, a `TreeWalker` traverses DOM text nodes to find and highlight words via `highlightVisualWord()` from `src/highlighting-utils.js`
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
- **KokoroPlayer** (`src/kokoro-player.js`) renders each chunk as an independent `<audio>` element with controls
  - Cards append incrementally to the DOM via `_appendChunkCard()` — existing playback is never interrupted
  - Active chunk is highlighted with a blue border and blue background; styling updates are targeted via `_setCardActive()` (not full DOM rebuilds)
  - Auto-advance is driven by the `ended` event on each audio element
  - Click any chunk card to seek directly to it (pauses all audio, plays the clicked chunk)
  - Merged audio can be downloaded as WAV via `downloadMerged()` after generation completes
  - Mobile autoplay policy handling: detects mobile browsers via user-agent/touch points, starts audio muted, shows "▶ Tap to play" indicators, unmutes when ready
  - Fallback mechanisms: `canplay` event listener (fires earlier than `canplaythrough`), 2-second timeout fallback, retry logic with 100ms delay on play failures
  - Graceful error handling for `NotAllowedError` (autoplay blocked) with `_handleAutoplayBlocked()` method
  - Mobile behavior: shows "Tap to play" indicator on auto-advance; desktop auto-plays with 300ms delay
- Chunk-by-chunk text highlighting is synced via `_onChunkPlay` callback (set in `src/app.js`)

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

### State

Managed via class instances and module-level variables across the modular source files — no framework state management. Key state:

**`src/app.js` (main):**
- `editorManager` (EditorManager instance) — manages `currentMarkdown`, `milkdownEditor`, `isSourceMode`
- `kokoroPlayer` (KokoroPlayer instance) — manages audio playback state
- `ttsController` (TTSController instance) — manages `isSpeaking`, `speechOffsetStart`, `activeEngine` (`'webspeech'` | `'kokoro'`), `kokoroTextToSpeak`, `kokoroStartOffset`
- `voices` (Web Speech voices array), `isSafari`, `isMobile` (browser detection)

**`src/settings-persistence.js`:**
- `STORAGE_KEY = 'freetts-settings'` — localStorage persistence for engine, voice, speed, pitch

**`src/global-switches.js`:**
- `debugMode` — global debug flag controlled by `getDebugMode()`/`setDebugMode()`

### Settings Persistence

TTS settings (engine, voice, speed, pitch) are saved to localStorage under key `freetts-settings`. Managed by functions in `src/settings-persistence.js`:
- `saveTTSSettings()` — persist current settings
- `loadTTSSettings()` — restore settings from localStorage
- `resetTTSSettings()` — reset all settings to defaults
- `getSavedVoice()` — retrieve saved voice index
- `saveIfNoSettings()` — initial setup helper

Settings are loaded automatically before playback via `TTSController.togglePlayback()`.

### Styling

- `css/tailwind.min.css` — minified Tailwind (static, not processed)
- `css/FreeTTSStyles.css` — custom overrides, dark mode transitions, Milkdown editor theming
- Theme (light/dark) is toggled via a `data-theme` attribute on `<html>` and persisted in `localStorage`. Theme toggle is initialized by `initThemeToggle()` in `src/ui-manager.js`.

### Deployment

GitHub Pages serves at `https://webitube.github.io/freetts/`. The `vite.config.js` sets `base: '/freetts/'` so asset paths resolve correctly after build.

## DevOps

Detailed build, deployment, and CI/CD instructions are documented in [DEVOPS.md](./DEVOPS.md).
