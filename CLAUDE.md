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

The base path in `vite.config.js` is set to `/freetts_dist/` for GitHub Pages deployment. Change this if deploying elsewhere.

## Architecture

FreeTTS is a vanilla JavaScript single-page app with no frontend framework. All application logic lives in two files:

- **`index.html`** — full HTML structure, Tailwind utility classes, modal markup
- **`FreeTtsUtils.js`** — all app logic (~286 lines): editor init, mode switching, TTS playback, theme management

### Editor Modes

The app has two editing modes toggled via tab buttons:

1. **Reveal Codes** — a `<textarea>` showing raw Markdown with syntax visible
2. **Visual** — a [Milkdown](https://milkdown.dev/) WYSIWYG editor instance

Mode switching syncs content between the textarea and Milkdown via its `replaceAll` command. Milkdown is initialized lazily on first switch to Visual mode. The Milkdown instance is loaded from `esm.sh` CDN (not bundled), so the app works without a build step by opening `index.html` directly — but the Vite build is used for GitHub Pages deployment.

### TTS Engine

Uses the native Web Speech API (`SpeechSynthesis`). Key behavior:
- Markdown syntax is stripped before speaking using regex in `cleanMarkdownForSpeech()`
- Word-level highlighting uses `SpeechSynthesisUtterance` boundary events
- In Reveal Codes mode, word highlighting is calculated by character offsets on the textarea
- In Visual mode, a `TreeWalker` traverses DOM text nodes to find and highlight words
- TTS can start from a cursor position or text selection

### State

Managed via simple module-level variables — no framework state management. Key globals: current editing mode, Milkdown editor instance, current TTS utterance, and word position tracking.

### Styling

- `css/tailwind.min.css` — minified Tailwind (static, not processed)
- `css/FreeTTSStyles.css` — custom overrides, dark mode transitions, Milkdown editor theming
- Theme (light/dark) is toggled via a `data-theme` attribute on `<html>` and persisted in `localStorage`

### Deployment

GitHub Pages serves from the `dist/` folder via the `/freetts_dist/` base path. The `vite.config.js` sets this base so asset paths resolve correctly after build.

## DevOps

Detailed build, deployment, and CI/CD instructions are documented in [DEVOPS.md](./DEVOPS.md).
