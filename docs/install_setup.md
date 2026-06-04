# Installation & Setup

This guide covers installing FreeTTS and getting it running locally.

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 9+ (bundled with Node.js)
- A modern browser (Chrome/Edge recommended for WebGPU support)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/webitube/freetts.git
cd freetts
```

### 2. Install Dependencies

```bash
npm install
```

This installs all required dependencies including:
- **Milkdown** 7.20 — WYSIWYG Markdown editor framework
- **kokoro-js** 1.2.0 — Neural TTS engine
- **onnxruntime-web** 1.22.0 — ONNX Runtime for browser inference
- **phonemizer** 1.2.1 — Text phonemization for Kokoro
- **Vite** 8 — Build tool and dev server
- **Vitest** 4 — Testing framework

### 3. Start Development Server

```bash
npm run dev
```

This launches Vite's development server with Hot Module Replacement (HMR). The app will be available at `http://localhost:5173` (or the next available port).

### 4. Build for Production

```bash
npm run build
```

Produces optimized production assets in the `dist/` directory.

### 5. Preview Production Build

```bash
npm run preview
```

Serves the production build locally for testing before deployment.

## Kokoro TTS Model Download

The first time you use Kokoro TTS, the neural model is downloaded from Hugging Face and cached in IndexedDB.

| Backend | Model File | Size |
|---------|-----------|------|
| WebGPU | `model.onnx` | 326 MB |
| WASM | `model_q8f16.onnx` | 86 MB |

**Notes:**
- A stable internet connection is required for the initial download.
- The model is cached locally and only downloads once.
- WebGPU is available in Chromium-based browsers (Chrome, Edge). Firefox and Safari fall back to WASM.
- **Kokoro TTS is disabled on mobile devices** due to ONNX Runtime constraints.

## Browser Compatibility

| Feature | Chrome | Edge | Firefox | Safari |
|---------|--------|------|---------|--------|
| Web Speech API | ✅ | ✅ | ✅ | ✅ |
| Kokoro (WebGPU) | ✅ | ✅ | ❌ | ❌ |
| Kokoro (WASM) | ✅ | ✅ | ✅ | ✅ |
| WebGPU | ✅ 113+ | ✅ 113+ | ❌ | ❌ |

## Deployment

FreeTTS is a static single-page application and can be deployed to any static hosting service:

- **GitHub Pages** — Push to `master` branch; GitHub Actions handle deployment.
- **Netlify** — Connect repository and deploy.
- **Vercel** — Connect repository and deploy.
- **Any static host** — Upload the contents of `dist/`.

```bash
# Deploy via GitHub Actions
npm run deploy
```

## Configuration

FreeTTS uses Vite's configuration in `vite.config.js`. Key settings:

- **Build target:** ES2020
- **Output directory:** `dist/`
- **Base path:** Configured for GitHub Pages deployment

## Troubleshooting

### Development server won't start

Ensure Node.js 18+ is installed:

```bash
node --version
npm --version
```

Clear the node_modules and reinstall:

```bash
rm -rf node_modules
npm install
```

### Kokoro model download fails

- Check your internet connection.
- Ensure your browser supports the required backend (WebGPU or WASM).
- Check browser console for specific error messages.

### Voices not appearing

- **Web Speech API:** Voice availability depends on your OS and browser. Try Chrome on Windows/macOS for the most voices.
- **Kokoro:** Wait for the model download to complete. Check the status indicator in the UI.

## Related Documentation

- **[DevOps Guide](DEVOPS.md)** — Comprehensive build, test, deployment, and CI/CD instructions.
- **[Usage Guide](usage.md)** — How to use FreeTTS effectively.
- **[Architecture Overview](app_logic.md)** — System architecture and module design.
- **[Testing Guide](testing.md)** — Test structure and running tests.
