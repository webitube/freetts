# FreeTTS Documentation

FreeTTS is a sophisticated **Markdown editor with integrated Text-to-Speech (TTS)** capabilities. It's a lightweight, portable single-page application built with TypeScript, Vite, and modern web technologies.

## Overview

FreeTTS combines a powerful dual-mode Markdown editor with intelligent speech synthesis, allowing users to compose, edit, and listen to Markdown content with word-level highlighting and tracking.

![FreeTTS Screenshot](https://github.com/webitube/freetts/raw/master/images/FreeTTSMarkdownEditor.png)

## Key Features

### Hybrid Editing Modes

- **Source Mode (Reveal Codes):** Direct Markdown manipulation with monospace font support and full syntax visibility.
- **Visual Mode (WYSIWYG):** A rich text editing experience powered by [Milkdown](https://milkdown.dev/) 7.20, with instant rendering of tables, blockquotes, lists, and formatting.

### Smart Text-to-Speech

- **Dual Engine Support:**
  - **Web Speech API:** Native browser-based TTS — no downloads required.
  - **Kokoro TTS:** Neural speech synthesis using `kokoro-js` and ONNX Runtime (WebGPU/WASM).
- **Syntax Cleaning:** Automatically strips Markdown symbols (`###`, `**`, `| --- |`) during playback for natural-sounding speech.
- **Word-Level Tracking:** Synchronized highlighting of spoken words in both source and visual editor modes.
- **Selection Support:** Highlight a specific block to listen to it, or place the cursor to play from that point.

### Reactive State Management

- **AppStore:** Centralized reactive state using [ReactiveTypescript](https://github.com/ReactiveTypescript/ReactiveTypescript).
- **Settings Persistence:** Engine, voice, speed, pitch, and theme settings auto-saved to `localStorage`.

### Modern UI/UX

- **Theme Switcher:** Light/Dark mode with `prefers-color-scheme` support.
- **Responsive Design:** Built with Tailwind CSS for mobile, tablet, and desktop.
- **Keyboard Shortcuts:** `Ctrl+Enter` / `Cmd+Enter` to toggle TTS playback.

## Technical Stack

| Component | Technology |
|-----------|-----------|
| Language | TypeScript (ES2020, strict mode) |
| Build Tool | Vite 8 (HMR, optimized bundling) |
| Core Editor | [Milkdown](https://milkdown.dev/) 7.20 |
| State Management | [ReactiveTypescript](https://github.com/ReactiveTypescript/ReactiveTypescript) |
| Styling | [Tailwind CSS](https://tailwindcss.com/) |
| Icons | [Lucide](https://lucide.dev/) (inline SVG) |
| TTS Engines | Web Speech API + Kokoro TTS |
| Testing | Vitest 4 with happy-dom |

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test
```

## Documentation Structure

This documentation is generated using [MkDocs](https://www.mkdocs.org/) with the Material theme. The documentation is organized into the following sections:

| Section | Description |
|---------|-------------|
| [Getting Started](install_setup.md) | Installation, setup, and usage guide |
| [Architecture](app_logic.md) | System architecture and module design |
| [TypeScript API](ts_docs.md) | API reference for all TypeScript modules |
| [DevOps](DEVOPS.md) | Building, testing, deployment, and CI/CD |
| [Testing](testing.md) | Test guide, unit tests, and integration tests |
| [ReactiveTypescript](reactive-typescript.md) | Reactive state management documentation |
| [Changelog](changelog.md) | Version history and notable changes |
| [License](license.md) | License information |

## Navigation

- **[Getting Started](install_setup.md)** — Installation and setup instructions.
- **[Usage Guide](usage.md)** — How to use FreeTTS effectively.
- **[Architecture](app_logic.md)** — Deep dive into the system architecture.
- **[TypeScript API](ts_docs.md)** — API reference documentation.
- **[DevOps](DEVOPS.md)** — Building, testing, deployment, and CI/CD pipelines.
- **[Testing](testing.md)** — Testing guide and coverage information.

## License

FreeTTS is released under the [ISC License](license.md).

## Links

- **GitHub:** [webitube/freetts](https://github.com/webitube/freetts)
- **Issues:** [Report a bug](https://github.com/webitube/freetts/issues)
