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

- **`src/app.js`** (~272 lines) — Main entry point: initializes all modules (`EditorManager`, `TTSController`, `KokoroPlayer`), handles DOMContentLoaded, sets up KokoroPlayer callbacks for status updates and speaking state sync

### Editor Module

- **`src/editor-manager.js`** (~104 lines) — `EditorManager` class: Milkdown editor initialization, mode switching between Reveal Codes (textarea) and Visual (WYSIWYG). Initializes Milkdown lazily on first switch to Visual mode.

### TTS Module

- **`src/tts-controller.js`** (~177 lines) — `TTSController` class: TTS playback logic for both Web Speech and Kokoro engines, word highlighting, pitch conversion, state management (`isSpeaking`, `activeEngine`, `kokoroTextToSpeak`)

### Kokoro Module

- **`src/kokoro-player.js`** (~347 lines) — `KokoroPlayer` class: chunk-based audio playback with mobile autoplay handling, incremental card rendering, merged audio download
- **`src/kokoro-audio-player.js`** (~78 lines) — Audio playback control helpers for Kokoro chunks
- **`src/kokoro-chunk-manager.js`** (~43 lines) — Chunk state management for Kokoro audio generation
- **`src/kokoro-chunk-renderer.js`** (~113 lines) — Chunk card DOM rendering with incremental append
- **`src/kokoro-ui-manager.js`** (~87 lines) — Kokoro-specific UI elements (download button, status display)
- **`src/kokoro-worker-communication.js`** (~150 lines) — Worker message handling (init, text, audio, status, errors)

### Shared Utilities

- **`src/tts-worker.js`** (~73 lines) — Web Worker that runs `kokoro-js` (ONNX Runtime) with `TextSplitterStream` for streaming TTS generation
- **`src/settings-persistence.js`** (~154 lines) — `saveTTSSettings()`, `loadTTSSettings()`, `resetTTSSettings()`, `getSavedVoice()`, `saveIfNoSettings()` — localStorage persistence under `freetts-settings`
- **`src/voice-manager.js`** (~98 lines) — `loadWebSpeechVoices()`, `loadKokoroVoices()`, `updatePitchWarning()` — voice loading and Kokoro voice sync
- **`src/ui-manager.js`** (~90 lines) — `initThemeToggle()`, `initHelpModal()`, `initClipboardAndDownload()`, `setUIState()` — UI initialization and state updates
- **`src/highlighting-utils.js`** (~72 lines) — `cleanMarkdown()`, `highlightVisualWord()`, `getVisualCursorInfo()` — text cleaning and word highlighting
- **`src/debug-log.js`** (~95 lines) — `debugLog()`, `debugWarn()`, `debugError()` with start/end markers
- **`src/global-switches.js`** (~9 lines) — Global `debugMode` flag with `getDebugMode()`/`setDebugMode()`

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
- Model loaded from Hugging Face (`onnx-community/Kokoro-82M-v1.0-ONNX`) on first use
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
