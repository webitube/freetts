# FreeTTS DevOps Guide

This document covers building, testing, deployment, and infrastructure for the FreeTTS project. It provides instructions for developers and maintainers to set up the development environment, run the application locally, build for production, deploy to GitHub Pages, and set up continuous integration and delivery (CI/CD) pipelines.

## Overview

FreeTTS is a single‑page web application built with vanilla JavaScript and uses Vite as the build tool. The application features a hybrid Markdown editor (Milkdown) and a dual Text‑to‑Speech engine: the native Web Speech API and Kokoro TTS (a neural TTS engine powered by `kokoro-js` and ONNX Runtime Web, running in a Web Worker). The project is designed to be lightweight, portable, and easy to integrate.

**Key technology stack:**
- **Build tool:** Vite
- **Editor framework:** Milkdown (bundled via npm)
- **TTS engines:** Web Speech API + Kokoro TTS (`kokoro-js`, ONNX Runtime Web)
- **Off‑thread audio generation:** Web Worker (`src/tts-worker.js`)
- **Styling:** Tailwind CSS (pre‑compiled)
- **Package manager:** npm
- **Hosting:** GitHub Pages (static hosting)

## Prerequisites

- **Node.js** version 18 or later (includes npm)
- **Git** for version control and deployment
- A GitHub account with write access to the repository (for deployment)

## Development Environment Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/webitube/freetts.git
   cd freetts
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```
   This installs Vite (dev dependency), Milkdown packages, and the Kokoro TTS stack (`kokoro-js`, `onnxruntime-web`, `phonemizer`).

3. **Verify installation**
   - Check Node.js version: `node --version`
   - Check npm version: `npm --version`
   - Ensure the `node_modules` directory is created.

The project does not require a database, external API keys, or environment variables for basic functionality.

## Local Development

Run the development server with hot‑module replacement (HMR):

```bash
npx vite
```

Vite will start the server, usually at `http://localhost:5173`. Open this URL in a browser to see the application. Any changes to source files will trigger a live reload.

**Note:** The app uses ES module imports, a Web Worker, and ONNX Runtime Web, so it **requires** `npx vite` to run — it cannot be opened directly from the file system.

## Building for Production

Create an optimized, static build for deployment:

```bash
npx vite build
```

This command:
- Bundles and minifies JavaScript (where applicable)
- Copies all static assets (images, icons, CSS) to the `dist/` folder
- Applies the **base path** configured in `vite.config.js` (`/dist/` for GitHub Pages)
- Generates an `index.html` that references the built assets

The output directory `dist/` contains everything needed to serve the application as a static site.

**Preview the production build locally:**
```bash
npx vite preview
```
This starts a local web server that serves the contents of `dist/` exactly as they would appear in production. Use it to catch any path‑related issues before deploying.

### Build Configuration

The build is controlled by `vite.config.js`:

```javascript
import { defineConfig } from 'vite';

export default defineConfig({
    base: '/dist/',
    assetsInclude: ['**/*.onnx', '**/*.json'],
    optimizeDeps: {
        exclude: ['onnxruntime-web'],
    },
});
```

- `base`: sets the public base path for GitHub Pages (change this if deploying to a different subpath or custom domain).
- `assetsInclude`: ensures `.onnx` model files and `.json` tokenizer files are served as static assets.
- `optimizeDeps.exclude`: prevents Vite from trying to bundle ONNX Runtime (loaded dynamically by `kokoro-js`).

## Testing

Currently, the project does not have an automated test suite. However, manual testing should cover:

1. **Editor modes:** Switch between “Reveal Codes” and “Visual” modes and verify content synchronization.
2. **Web Speech TTS:** Select text and click the play button; ensure word‑level highlighting works in both modes.
3. **Kokoro TTS:** Switch the engine selector to "Kokoro TTS", select text, and play. Verify:
   - Audio chunks appear as cards and play sequentially without cutting each other short
   - The active chunk is highlighted with a blue border
   - Clicking a chunk card seeks directly to that chunk
   - The "Download Audio" button appears after generation completes
   - No AbortErrors appear in the browser console
4. **Engine switching:** Toggle between Web Speech and Kokoro, verify each plays correctly.
5. **Theme toggling:** Click the theme icon and verify that light/dark modes are applied and persisted.
6. **Export features:** Test the “Copy” and “Download .md” buttons.
7. **Responsive layout:** Resize the browser and confirm the UI adapts correctly.

**Future improvements:** Adding unit tests and integration tests with a headless browser (e.g., Playwright) is recommended.

## Deployment

### Option 1: Manual Deployment to GitHub Pages (using `gh-pages`)

1. Install the `gh-pages` package as a dev dependency:
   ```bash
   npm install --save-dev gh-pages
   ```

2. Add a deploy script to `package.json`:
   ```json
   "scripts": {
     "dev": "vite",
     "build": "vite build",
     "preview": "vite preview",
     "deploy": "gh-pages -d dist"
   }
   ```

3. Build the project and deploy:
   ```bash
   npm run build
   npm run deploy
   ```
   The `gh-pages` tool will create a `gh-pages` branch (if it doesn’t exist) and push the contents of `dist/` to it. GitHub Pages will automatically start serving the site from that branch.

   The live site will be available at `https://<username>.github.io/freetts/` (or your custom domain).

### Option 2: Automated Deployment with GitHub Actions

Create a CI/CD pipeline that builds and deploys the site on every push to the `main` (or `master`) branch. A workflow file (`.github/workflows/deploy.yml`) is already provided in the repository.

1. The workflow file `.github/workflows/deploy.yml` is already present. If you need to customize it, here is its content:

   ```yaml
   name: Deploy to GitHub Pages

   on:
     push:
       branches: [main, master]

   jobs:
     build-and-deploy:
       runs-on: ubuntu-latest
       permissions:
         contents: write
       steps:
         - name: Checkout
           uses: actions/checkout@v4

         - name: Setup Node.js
           uses: actions/setup-node@v4
           with:
             node-version: '20'

         - name: Install dependencies
           run: npm ci

         - name: Build
           run: npm run build

         - name: Deploy to GitHub Pages
           uses: peaceiris/actions-gh-pages@v3
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             publish_dir: ./dist
             # Optional: set a custom base path if different from '/dist/'
             # cname: example.com
   ```

2. Ensure the workflow file is committed and pushed (if it's not already in the repository):
   ```bash
   git add .github/workflows/deploy.yml
   git commit -m "Add GitHub Actions deployment workflow"
   git push origin main
   ```

3. The workflow will run automatically on future pushes. You can monitor its progress under the **Actions** tab of your GitHub repository.

**Notes:**
- Ensure GitHub Pages is enabled in your repository settings (Settings → Pages) and set to use the `gh‑pages` branch as the source.
- The `peaceiris/actions-gh-pages` action handles the branch creation/update and triggers a Pages rebuild.
- If you change the `base` in `vite.config.js`, ensure the GitHub Pages repository settings match the new subpath (or use a custom domain).

### Option 3: Deploy to Other Static Hosts (Netlify, Vercel, Cloudflare Pages)

The built `dist/` folder can be deployed to any static hosting service.

**Netlify example:**
1. Connect your repository to Netlify.
2. Set the build command: `npm run build`
3. Set the publish directory: `dist`
4. Add an environment variable (if needed) for the base path: `PUBLIC_URL=/`

**Important:** If you deploy to a service that serves the site at the root (not a subpath), update `vite.config.js` to set `base: '/'`.

## Continuous Integration and Delivery (CI/CD)

Beyond deployment, you can set up additional CI steps to ensure code quality:

- **Linting:** Add ESLint and run it in the workflow.
- **Formatting:** Use Prettier to enforce consistent style.
- **Security scanning:** Integrate `npm audit` or third‑party security scanners.

Example extended workflow step:

```yaml
- name: Lint
  run: npm run lint   # if you add a lint script
- name: Audit dependencies
  run: npm audit --audit-level=high
```

## Monitoring and Maintenance

Because FreeTTS is a static front‑end application, monitoring focuses on user‑facing functionality and asset availability.

1. **Regularly test the live site** for TTS compatibility (browser updates can affect the Web Speech API).
2. **Check browser compatibility:** The application uses modern JavaScript features; ensure it works on target browsers (Chrome, Firefox, Safari, Edge).
3. **Update dependencies** periodically:
   ```bash
   npm outdated
   npm update
   npm audit fix
   ```
4. **Review GitHub Pages build logs** if deployments fail.

## Troubleshooting

| Problem | Possible cause | Solution |
|---------|---------------|----------|
| Local dev server won’t start | Port 5173 already in use | Run `npx vite --port 3000` or kill the process using the port. |
| Milkdown editor not loading in Visual mode | Bundling issue or dependency mismatch | Check that `npm install` completed successfully and all Milkdown packages match versions. |
| Kokoro TTS never starts speaking | Model not downloaded yet (first load) | The Kokoro 82M ONNX model downloads on first use (~200 MB). Wait for "Kokoro TTS ready." status. |
| Kokoro TTS uses WASM instead of WebGPU | Browser doesn’t support WebGPU | Falls back to WASM automatically. A `powerPreference` Chromium warning is harmless (crbug.com/369219127). |
| TTS not speaking/highlighting (Web Speech) | Web Speech API not supported or voice not available | Use a modern browser (Chrome/Edge). Check browser permissions for speech synthesis. |
| Built site shows blank page | Incorrect base path for hosting | Adjust `base` in `vite.config.js` to match your deployment subpath. |
| GitHub Pages returns 404 | Repository not configured for Pages, or wrong branch | In repository Settings → Pages, set source branch to `gh‑pages` (or `main/docs`). |
| Deployment workflow fails | Insufficient permissions | Ensure the workflow has `contents: write` permission and the `GITHUB_TOKEN` is present. |

## References

- [Vite Documentation](https://vitejs.dev/)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Milkdown Documentation](https://milkdown.dev/)
- [Web Speech API MDN](https://developer.mozilla.org/en‑US/docs/Web/API/Web_Speech_API)
- [Kokoro TTS / kokoro-js](https://github.com/nicklausw/kokoro-js)
- [ONNX Runtime Web](https://onnxruntime.ai/)
- [Tailwind CSS](https://tailwindcss.com/)

---

*Last updated: 2026‑05‑02*