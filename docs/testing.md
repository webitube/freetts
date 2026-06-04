# Testing Guide

FreeTTS uses Vitest 4 with happy-dom for comprehensive unit and integration testing. This guide covers the testing setup, structure, and how to run tests.

## Test Framework

| Package | Version | Purpose |
|---------|---------|---------|
| `vitest` | 4.1.5 | Testing framework |
| `@vitest/browser` | 4.1.5 | Browser test runner |
| `happy-dom` | 20.9.0 | Lightweight DOM implementation |

## Test Structure

```
tests/
├── setup.js                  # Test environment setup (mocks)
├── unit/                     # Unit tests
│   ├── debug-log.test.js
│   ├── editor-manager.test.js
│   ├── global-switches.test.js
│   ├── highlighting-utils.test.js
│   ├── kokoro-audio-player.test.js
│   ├── kokoro-chunk-renderer.test.js
│   ├── settings-persistence.test.js
│   ├── tts-controller.test.js
│   ├── ui-manager.test.js
│   └── voice-manager.test.js
└── integration/              # Integration tests
    ├── editor-modes.test.js
    └── settings-persistence-flow.test.js
```

## Running Tests

### Run All Tests

```bash
npm run test
```

Equivalent to `npx vitest run`.

### Run Tests in Watch Mode

```bash
npm run test:watch
```

Re-runs tests on file changes.

### Run Tests with Coverage

```bash
npm run test:coverage
```

Generates a coverage report showing line, branch, and function coverage.

### Run Specific Test File

```bash
npx vitest run tests/unit/editor-manager.test.js
```

### Run Tests Matching a Pattern

```bash
npx vitest run -t "TTSController"
```

Runs only tests whose names match the pattern.

## Test Setup

The `tests/setup.js` file provides mocks for browser APIs that aren't available in the test environment:

### Mocks

| API | Mock Purpose |
|-----|-------------|
| `localStorage` | Simulates browser localStorage |
| `speechSynthesis` | Mocks Web Speech API |
| `document.getElementById` | Returns mock elements |
| `window.getSelection` | Returns mock selection |
| `document.createTreeWalker` | Returns mock DOM walker |
| `URL.createObjectURL` | Mocks blob URL creation |
| `navigator.gpu` | Mocks WebGPU availability |
| `navigator.userAgent` | Mocks browser detection |

### Configuration

```javascript
// tests/setup.js
global.localStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
};

global.speechSynthesis = {
    getVoices: vi.fn(() => []),
    speak: vi.fn(),
    cancel: vi.fn(),
};
```

## Unit Tests

Unit tests focus on individual modules in isolation.

### Editor Manager Tests (`editor-manager.test.js`)

- Source/Visual mode switching
- Milkdown editor initialization
- Markdown synchronization between modes
- DOM element visibility toggling

### TTS Controller Tests (`tts-controller.test.js`)

- Engine selection (Web Speech vs Kokoro)
- Syntax cleaning
- Word-level highlighting
- Playback state management

### Settings Persistence Tests (`settings-persistence.test.js`)

- Save/load to localStorage
- Per-engine voice storage
- Settings reset
- Backward compatibility

### Voice Manager Tests (`voice-manager.test.js`)

- Voice selector population
- Saved voice restoration
- Web Speech voice loading
- Kokoro voice loading

### UI Manager Tests (`ui-manager.test.js`)

- Theme toggling
- Help modal open/close
- Playback control updates
- Clipboard and download functions

### Kokoro Tests

- **Audio Player** (`kokoro-audio-player.test.js`): Audio element creation, playback, cleanup
- **Chunk Renderer** (`kokoro-chunk-renderer.test.js`): Chunk card DOM rendering, event binding

### Highlighting Utils Tests (`highlighting-utils.test.js`)

- Visual word highlighting via TreeWalker
- Cursor info retrieval
- Markdown syntax cleaning

### Debug Log Tests (`debug-log.test.js`)

- Debug mode on/off
- Formatted log output
- Performance timers
- Array logging

### Global Switches Tests (`global-switches.test.js`)

- Debug mode flag management

## Integration Tests

Integration tests verify that modules work together correctly.

### Editor Modes Flow (`editor-modes.test.js`)

- Full Source → Visual → Source switching cycle
- Markdown content preservation across mode switches
- Editor state synchronization via AppStore

### Settings Persistence Flow (`settings-persistence-flow.test.js`)

- Complete save → reload → restore cycle
- Cross-module state synchronization
- localStorage persistence verification

## Writing New Tests

### Unit Test Template

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MyModule } from '../../src/my-module';

describe('MyModule', () => {
    beforeEach(() => {
        // Reset mocks and state
        vi.clearAllMocks();
    });

    it('should do something', () => {
        const instance = new MyModule();
        const result = instance.method();
        expect(result).toBe(expectedValue);
    });

    it('should handle edge cases', () => {
        const instance = new MyModule();
        expect(() => instance.method(null)).toThrow();
    });
});
```

### Integration Test Template

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppStore } from '../../src/app-store';
import { EditorManager } from '../../src/editor-manager';

describe('Editor Integration', () => {
    beforeEach(() => {
        AppStore.instance.resetSettings();
        vi.clearAllMocks();
    });

    it('should sync markdown across editor modes', async () => {
        const elements = {
            source: { value: '# Test' },
            visual: document.createElement('div'),
            container: document.createElement('div'),
            btnSource: document.createElement('button'),
            btnVisual: document.createElement('button'),
        };

        const editor = new EditorManager(elements, '# Test');
        await editor.switchToVisual();
        expect(AppStore.instance.isSourceMode.get()).toBe(false);
    });
});
```

## Test Coverage Goals

| Module | Target Coverage |
|--------|----------------|
| `app-store.ts` | 90%+ |
| `editor-manager.ts` | 85%+ |
| `tts-controller.ts` | 85%+ |
| `highlighting-utils.ts` | 90%+ |
| `settings-persistence.ts` | 90%+ |
| `ui-manager.ts` | 85%+ |
| `voice-manager.ts` | 85%+ |
| `kokoro-*` modules | 80%+ |
| `debug-log.ts` | 90%+ |
| `global-switches.ts` | 95%+ |

## Continuous Integration

Tests should pass before committing changes:

```bash
npm run test
```

For production builds, ensure no test regressions:

```bash
npm run test:coverage
```
