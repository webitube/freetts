# Usage Guide

This guide covers how to use FreeTTS effectively for composing and listening to Markdown content.

## Getting Started

### 1. Launch the Application

Open FreeTTS in your browser. The app loads with a default Markdown document containing an introduction to FreeTTS.

### 2. Choose Your Editor Mode

FreeTTS offers two editing modes, switchable via the **Source** / **Visual** buttons in the header:

#### Source Mode (Reveal Codes)

- Shows raw Markdown in a textarea with monospace font.
- Ideal for precise control over formatting syntax.
- TTS highlights the raw Markdown text as it speaks.
- **Best for:** Power users who prefer direct Markdown editing.

#### Visual Mode (WYSIWYG)

- Renders Markdown as formatted text in real-time.
- Powered by [Milkdown](https://milkdown.dev/) 7.20 with Nord theme.
- Supports tables, blockquotes, task lists, strike-through, and code blocks.
- TTS highlights the rendered text as it speaks.
- **Best for:** Users who prefer a word-processor-like experience.

### 3. Compose Your Content

Type or paste Markdown content in your preferred mode. The editor supports:

- Headings (`#` through `######`)
- Bold (`**text**`) and italic (`*text*`)
- Lists (ordered and unordered)
- Tables with alignment
- Task lists (`[x]`, `[ ]`)
- Strike-through (`~~text~~`)
- Code blocks and inline code
- Blockquotes
- Links and images

## Text-to-Speech

### Playing Audio

1. **Select text:** Highlight a paragraph or block you want to listen to.
2. **Choose a voice:** Use the voice dropdown to select from available voices.
3. **Click Play:** Press the play icon in the header, or use the keyboard shortcut.

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` / `Cmd+Enter` | Toggle TTS playback |

### Word-Level Highlighting

As audio plays, the corresponding text is highlighted in the editor:

- **Source Mode:** Raw Markdown text is highlighted character by character.
- **Visual Mode:** Rendered text is highlighted in the WYSIWYG view.

This helps you follow along with the spoken content.

### Selection Behavior

- **Selected text:** Only the highlighted portion is spoken.
- **No selection:** The entire document is spoken from the beginning.
- **Cursor position:** If no text is selected, playback starts from the cursor position.

### TTS Engine Selection

Switch between engines using the engine dropdown:

#### Web Speech API

- **No downloads required** — uses the browser's built-in `SpeechSynthesis` API.
- Voice availability depends on your OS and browser.
- Works on all platforms including mobile.
- **Best for:** Quick listening, mobile devices, broad voice selection.

#### Kokoro TTS

- **Neural speech synthesis** — produces more natural-sounding audio.
- Requires initial model download (326 MB WebGPU or 86 MB WASM).
- Model cached in IndexedDB — downloads only once.
- **Best for:** High-quality audio, desktop browsers (Chromium recommended).

### Playback Controls

| Control | Action |
|---------|--------|
| Play icon | Start playback |
| Stop icon | Stop playback |
| Engine dropdown | Switch between Web Speech and Kokoro |
| Voice dropdown | Select a specific voice |
| Speed slider | Adjust playback speed |
| Pitch slider | Adjust voice pitch |

### Kokoro Playback Features

- **Chunk-based playback:** Audio is generated in chunks for smooth streaming.
- **Chunk cards:** Each chunk is displayed as a card with play controls.
- **Click to seek:** Click any chunk card to jump to that portion.
- **Download merged audio:** Export all generated audio as a single WAV file.

## Settings

### Automatic Persistence

All settings are automatically saved to `localStorage` and restored on page reload:

- **TTS Engine** (Web Speech / Kokoro)
- **Selected Voice** (per engine)
- **Playback Speed**
- **Voice Pitch**
- **Theme** (Light / Dark)

### Resetting Settings

Use the reset function to restore default settings. This clears all saved preferences from `localStorage`.

## Theme

Toggle between Light and Dark modes using the moon/sun icon in the header. The preference is persisted across sessions. The app also respects your system's `prefers-color-scheme` setting on first load.

## Export

### Copy to Clipboard

Click the **Copy** button to copy the raw Markdown content to your clipboard.

### Download as .md

Click the **Download** button to save the current Markdown content as a `.md` file locally.

## Help & Cheatsheet

Click the **Help** icon to open a comprehensive cheatsheet covering:

- Markdown syntax reference
- TTS keyboard shortcuts
- Editor mode descriptions
- Tips and best practices

## Mobile Usage

FreeTTS is fully responsive and works on mobile devices:

- **Web Speech API** is available on all mobile browsers.
- **Kokoro TTS is disabled on mobile** due to ONNX Runtime constraints.
- Mobile browsers may show "Tap to play" indicators due to autoplay policies.
- Touch-friendly controls and responsive layout.

## Troubleshooting

### Voices not appearing

- Ensure you're using Chrome or Edge for the best voice selection.
- On Windows, install additional language packs in OS settings.
- On macOS, check System Settings > Accessibility > Spoken Content.

### Kokoro not working

- Wait for the model download to complete (may take several minutes).
- Check that your browser supports WebGPU (Chrome 113+ / Edge 113+) or WASM.
- Kokoro is disabled on mobile devices.

### Highlighting not working

- Ensure you're in the correct editor mode (Source or Visual).
- Check browser console for errors.
- Try switching editor modes and back.
