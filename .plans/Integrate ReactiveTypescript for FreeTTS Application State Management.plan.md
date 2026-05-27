## Plan: Integrate ReactiveTypescript for FreeTTS Application State Management

**TL;DR:** Convert FreeTTS from plain JavaScript to TypeScript, introduce a singleton `AppStore` class using ReactiveTypescript decorators (`@reactiveValue`, `@reactiveDict`, etc.) to centralize all application state, and wire up subscription callbacks so UI updates, settings persistence, and TTS engine responses react automatically to state changes. Existing tests are updated to work with the reactive store.

---

### Phase 1: Build & Wire ReactiveTypescript as a Dependency

1. **Build ReactiveTypescript** — Run `npm install && npm run build` inside `ReactiveTypescript/` to produce `dist/` output.
2. **Add Vite alias** — In `vite.config.js`, add an alias so `reactivetypescript` resolves to `ReactiveTypescript/dist/index.js`. This avoids publishing the library and keeps it a local workspace dependency.
3. **Verify import works** — Create a quick smoke test (e.g., `import { ReactiveValue } from 'reactivetypescript'` in a temp module) to confirm the alias resolves correctly.

### Phase 2: TypeScript Configuration

4. **Create `tsconfig.json`** for the FreeTTS root — Based on `ReactiveTypescript/tsconfig.json`, but adjusted for browser targets:
   - `module: ESNext`, `target: ES2020`
   - `experimentalDecorators: true`, `useDefineForClassFields: false` (required by ReactiveTypescript decorators)
   - `moduleResolution: bundler` (Vite-compatible)
   - `include: ["src/**/*"]`
5. **Update `vite.config.js`** — Ensure Vite resolves `.ts` files from `src/`. Vite 8 has built-in TypeScript support, so no extra plugin is needed.
6. **Update `vitest.config.js`** — Change coverage `include` from `src/**/*.js` to `src/**/*.ts`.

### Phase 3: Create the Singleton AppStore

7. **Create `src/app-store.ts`** — A singleton class modeled after `PlayingCardStore` from the ReactiveTypescript examples:
   - `static instance: AppStore` with lazy initialization
   - Private constructor
   - All reactive properties using decorators:

   ```
   @reactiveValue() engine = new ReactiveValue('webspeech')
   @reactiveValue() isSpeaking = new ReactiveValue(false)
   @reactiveValue() currentSpeed = new ReactiveValue(1)
   @reactiveValue() currentPitch = new ReactiveValue(0)
   @reactiveValue() currentTheme = new ReactiveValue('light')
   @reactiveValue() debugMode = new ReactiveValue(false)
   @reactiveValue() statusMessage = new ReactiveValue('Ready.')
   @reactiveValue() activeDevice = new ReactiveValue('')
   @reactiveValue() isSourceMode = new ReactiveValue(true)
   @reactiveValue() currentMarkdown = new ReactiveValue('')
   @reactiveValue() webSpeechVoicesLoaded = new ReactiveValue(false)
   @reactiveValue() kokoroVoicesLoaded = new ReactiveValue(false)
   @reactiveDict() savedVoices = new ReactiveDictionary() // { engine: voiceName }
   @reactiveList() webSpeechVoices = new ReactiveList()
   @reactiveValue() kokoroMergedBlob = new ReactiveValue(null)
   ```

8. **Add `saveToLocalStorage()` / `loadFromLocalStorage()` methods** — Replace the current `settings-persistence.js` logic. Serialize reactive values via `JSON.stringify()` (which calls `toJSON()` automatically), and hydrate via `ReactiveSerializer.hydrateInstance()` on restore.

9. **Add `subscribeToChanges()` method** — Sets up subscriptions on key reactive properties:
   - `engine` changed → trigger voice list reload, save settings
   - `isSpeaking` changed → update play/stop icons, button colors
   - `currentSpeed` / `currentPitch` changed → update slider display values, save settings
   - `currentTheme` changed → toggle `document.documentElement.classList`, persist
   - `statusMessage` changed → update `#tts-status` textContent
   - `isSourceMode` changed → sync editor mode UI indicators
   - `debugMode` changed → update global debug logging behavior

### Phase 4: Convert Source Files to TypeScript

10. **Convert utility modules first** (no DOM dependencies, lowest risk):
    - `src/global-switches.js` → `src/global-switches.ts` — Replace `debugMode` with `AppStore.instance.debugMode`
    - `src/debug-log.js` → `src/debug-log.ts` — Read debug mode from store
    - `src/app-utils.js` → `src/app-utils.ts` — Read status/device from store
    - `src/highlighting-utils.js` → `src/highlighting-utils.ts`

11. **Convert settings persistence**:
    - `src/settings-persistence.js` → `src/settings-persistence.ts` — Thin wrapper around `AppStore.saveToLocalStorage()` / `loadFromLocalStorage()`. Most logic moves into the store.

12. **Convert UI manager**:
    - `src/ui-manager.js` → `src/ui-manager.ts` — Theme toggle reads/writes `AppStore.instance.currentTheme`. Playback UI reads `AppStore.instance.isSpeaking`.

13. **Convert voice manager**:
    - `src/voice-manager.js` → `src/voice-manager.ts` — Web Speech & Kokoro voice loading populates `AppStore.instance.webSpeechVoices` and sets `kokoroVoicesLoaded`.

14. **Convert editor manager**:
    - `src/editor-manager.ts` — `EditorManager` reads/writes `AppStore.instance.isSourceMode` and `currentMarkdown`. Mode switching updates the store instead of internal state.

15. **Convert TTS controller**:
    - `src/tts-controller.ts` — `TTSController` reads `activeEngine`, `isSpeaking`, `voices` from store. Sets `isSpeaking` on start/stop.

16. **Convert Kokoro player modules** (in dependency order):
    - `src/kokoro-worker-communication.ts`
    - `src/kokoro-audio-player.ts`
    - `src/kokoro-chunk-manager.ts`
    - `src/kokoro-chunk-renderer.ts`
    - `src/kokoro-player.ts` — Reads/writes `status`, `chunks`, `currentChunkIndex`, `mergedBlob` from store.

17. **Convert TTS worker**:
    - `src/tts-worker.js` → `src/tts-worker.ts` — Workers have limited TS support; may need to keep as `.js` if `navigator`/`self` globals cause issues. If conversion succeeds, great.

18. **Convert main entry point**:
    - `src/app.js` → `src/app.ts` — Initialize `AppStore.instance`, set up subscriptions, wire DOM event handlers to SET store values (not direct DOM manipulation). Event handlers become thin wrappers: `store.engine.set(value)`, `store.isSpeaking.set(true)`, etc.

### Phase 5: Update Entry Point & Remove Old Patterns

19. **Update `index.html`** — Change `<script type="module" src="/src/app.js">` to `src/app.ts` (Vite handles `.ts` natively).
20. **Remove callback-heavy patterns** — The current code passes callbacks through constructors (e.g., `KokoroPlayer` takes 6 callbacks). Replace with subscriptions to `AppStore` reactive properties. Modules subscribe in their constructors and react to changes.
21. **Clean up `elements` object pattern** — The current code passes a giant `elements` dict everywhere. Replace with direct DOM queries where needed, or have the store hold references to frequently-accessed elements.

### Phase 6: Update Tests

22. **Update `vitest.config.js`** — Coverage include pattern to `src/**/*.ts`, exclude `src/app.ts` and `src/tts-worker.js/ts`.
23. **Update `tests/setup.js`** — Add mocks for ReactiveTypescript if needed. Ensure `localStorage` mock works with store hydration.
24. **Update unit tests** — Tests that mock `settings-persistence` or `global-switches` now interact with `AppStore`. Use `suppressNotifications()` during test setup to prevent spurious callbacks.
25. **Update integration tests** — Editor mode tests and settings persistence flow tests should verify reactive subscriptions fire correctly.
26. **Add store-specific tests** — Test `AppStore` serialization/deserialization, subscription callbacks, and hydration from localStorage.

### Phase 7: Validation & Cleanup

27. **Run `npm run dev`** — Verify dev server starts, app loads, all features work.
28. **Run `npm run test`** — All tests pass.
29. **Run `npm run build`** — Production build succeeds.
30. **Delete old `.js` files** from `src/` after confirming `.ts` replacements work.
31. **Update `AGENTS.md`** — Reflect new architecture (AppStore, TypeScript, reactive subscriptions).

---

### Relevant Files

| File | Role |
|---|---|
| `ReactiveTypescript/src/index.ts` | All reactive types exported — template for imports |
| `ReactiveTypescript/Examples/PlayingCardStore.ts` | Singleton store pattern to replicate |
| `ReactiveTypescript/tsconfig.json` | Base TS config to adapt |
| `src/app.js` | Main entry — orchestrates everything, will become `app.ts` |
| `src/settings-persistence.js` | Current settings logic — moves into AppStore |
| `src/global-switches.js` | Debug mode flag — becomes reactive value |
| `src/tts-controller.js` | TTS state — becomes reactive |
| `src/editor-manager.js` | Editor state — becomes reactive |
| `src/ui-manager.js` | UI state — becomes reactive |
| `src/voice-manager.js` | Voice state — becomes reactive |
| `src/kokoro-player.js` + sub-modules | Kokoro state — becomes reactive |
| `src/app-utils.js` | Utility functions — read from store |
| `src/debug-log.js` | Debug logging — reads debugMode from store |
| `vite.config.js` | Add alias, ensure `.ts` resolution |
| `vitest.config.js` | Update coverage patterns |
| `tests/setup.js` | Add ReactiveTypescript mocks |
| `tests/unit/*.test.js` | Update to use AppStore |
| `tests/integration/*.test.js` | Update to use AppStore |
| `index.html` | Update script src to `.ts` |

---

### Verification

1. `cd ReactiveTypescript && npm install && npm run build` — Library builds successfully
2. `npm run dev` — Dev server starts, app loads in browser
3. `npm run test` — All unit + integration tests pass
4. `npm run build` — Production build completes without errors
5. Manual verification: Toggle engine (Web Speech ↔ Kokoro), change speed/pitch, toggle theme, switch editor mode — all changes persist and UI reacts
6. Manual verification: Reload page — settings are restored from localStorage via reactive hydration
7. `npm run test:coverage` — Coverage report shows `src/**/*.ts` files

---

### Decisions

- **Full TypeScript conversion** — User chose to convert all `src/` files to `.ts`
- **Singleton store** — One `AppStore` class with `static instance`, all reactive properties decorated
- **All state reactive** — Settings, playback, editor, UI, debug mode — everything in the store
- **Callbacks replaced by subscriptions** — Instead of passing 6+ callbacks through constructors, modules subscribe to reactive properties
- **ReactiveTypescript as local alias** — Not published to npm, consumed via Vite alias from `ReactiveTypescript/dist/`
- **`src/tts-worker.js` may remain `.js`** — Web Workers have different module resolution; convert if possible, fallback to `.js`

### Further Considerations

1. **Worker TypeScript support** — `tts-worker.js` uses `self`/`navigator` globals. TS conversion may require a custom `*.d.ts` declaration file. Recommendation: Attempt conversion, fall back to `.js` if globals cause issues.
2. **Migration granularity** — Converting 15+ files is non-trivial. Recommendation: Convert in the dependency order listed (utilities → store → managers → player → app entry), testing after each group.
3. **ReactiveTypescript versioning** — The library is at `1.0.0` locally. If the API changes, the store may need updates. Recommendation: Pin the version and consider a `link:` dependency in `package.json` for explicit workspace linking.
