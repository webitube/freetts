# FreeTTS Test Plan

## Overview

This document outlines the testing strategy, test procedures, and test execution steps for the FreeTTS project (Free Markdown Editor with Web-Based TTS).

**Current Status: ✅ ALL TESTS PASSING (126/126)**

## Test Framework

- **Framework:** Vitest v4.1.5
- **Environment:** happy-dom (DOM simulation)
- **Coverage Tool:** Istanbul
- **Test Files Location:** `tests/`
  - `tests/unit/` - Unit tests for individual modules (9 files, 119 tests)
  - `tests/integration/` - Integration tests for module interactions (2 files, 7 tests)
  - `tests/setup.js` - Global test setup and mocks

## Test Structure

### Unit Tests

| Test File | Module Tested | Functions/Classes | Tests | Status |
|-----------|---------------|-------------------|-------|--------|
| `tests/unit/global-switches.test.js` | `src/global-switches.js` | `getDebugMode()`, `setDebugMode()` | 5 | ✅ |
| `tests/unit/debug-log.test.js` | `src/debug-log.js` | `repeatChar()`, `debugLog()`, `debugLogEnd()`, `debugWarn()`, `debugWarnEnd()`, `debugError()`, `debugErrorEnd()` | 18 | ✅ |
| `tests/unit/voice-manager.test.js` | `src/voice-manager.js` | `loadWebSpeechVoices()`, `loadKokoroVoices()` | 13 | ✅ |
| `tests/unit/editor-manager.test.js` | `src/editor-manager.js` | `EditorManager` class (constructor, `createEditor()`, `switchToVisual()`, `switchToSource()`, `getCurrentMarkdown()`, `setCurrentMarkdown()`, `isCurrentlySourceMode()`) | 15 | ✅ |
| `tests/unit/highlighting-utils.test.js` | `src/highlighting-utils.js` | `cleanMarkdown()`, `highlightVisualWord()`, `getVisualCursorInfo()` | 17 | ✅ |
| `tests/unit/settings-persistence.test.js` | `src/settings-persistence.js` | `saveTTSSettings()`, `loadTTSSettings()`, `resetTTSSettings()`, `getSavedVoice()`, `setSavedVoice()`, `saveIfNoSettings()`, `getStorageKey()` | 15 | ✅ |
| `tests/unit/ui-manager.test.js` | `src/ui-manager.js` | `initThemeToggle()`, `initHelpModal()`, `initClipboardAndDownload()`, `setUIState()` | 14 | ✅ |
| `tests/unit/tts-controller.test.js` | `src/tts-controller.js` | `TTSController` class (constructor, `setActiveEngine()`, `getActiveEngine()`, `togglePlayback()`, `speakWithWebSpeech()`, `stopWebSpeech()`, `speakWithKokoro()`, `stopKokoro()`, `setUIState()`) | 14 | ✅ |

### Integration Tests

| Test File | Scenario Tested | Tests | Status |
|-----------|-----------------|-------|--------|
| `tests/integration/editor-modes.test.js` | Editor mode switching, content synchronization between Source and Visual modes | 7 | ✅ |
| `tests/integration/settings-persistence-flow.test.js` | Save-load-reset cycle, engine switching with settings, settings validation | 8 | ✅ |

## Step-by-Step Test Execution Procedures

### Prerequisites

1. Node.js v18+ installed
2. Dependencies installed: `npm install`

### Running All Tests

```bash
npm test
```

This runs all tests in `tests/` directory and outputs results to console.

### Running Tests with Coverage

```bash
npm run test:coverage
```

Coverage reports are generated in `coverage/` directory:
- `coverage/index.html` - HTML coverage report
- `coverage/coverage-final.json` - JSON coverage data
- `coverage/lcov-report/index.html` - Lcov HTML report

### Running Tests in Watch Mode

```bash
npm run test:watch
```

### Running Specific Test Files

```bash
# Run all unit tests
npx vitest run tests/unit/

# Run specific test file
npx vitest run tests/unit/settings-persistence.test.js

# Run integration tests only
npx vitest run tests/integration/
```

### Running Tests Matching a Pattern

```bash
# Run tests matching "settings"
npx vitest run -t "settings"

# Run tests matching "editor"
npx vitest run -t "editor"
```

## Test Categories and Procedures

### 1. Global Switches Tests

**File:** `tests/unit/global-switches.test.js`

**Steps:**
1. Run: `npx vitest run tests/unit/global-switches.test.js`
2. Verify: `getDebugMode()` returns correct boolean values
3. Verify: `setDebugMode()` updates internal state
4. Verify: `getDebugMode()` returns the module-initialized state without prior mutation

### 2. Highlighting Utils Tests

**File:** `tests/unit/highlighting-utils.test.js`

**Steps:**
1. Run: `npx vitest run tests/unit/highlighting-utils.test.js`
2. Verify: `cleanMarkdown()` removes `#`, `*`, `_`, `~`, `` ` `` characters
3. Verify: `cleanMarkdown()` removes link syntax `[]()` and keeps link text
4. Verify: `cleanMarkdown()` replaces `|` with spaces
5. Verify: `highlightVisualWord()` creates proper DOM selection ranges
6. Verify: `getVisualCursorInfo()` returns correct text and offset

### 3. Settings Persistence Tests

**File:** `tests/unit/settings-persistence.test.js`

**Steps:**
1. Run: `npx vitest run tests/unit/settings-persistence.test.js`
2. Verify: `saveTTSSettings()` stores settings in localStorage
3. Verify: `loadTTSSettings()` restores settings from localStorage
4. Verify: `resetTTSSettings()` clears localStorage and resets to defaults
5. Verify: `getSavedVoice()` returns correct voice for engine
6. Verify: `setSavedVoice()` updates voice in settings
7. Verify: `saveIfNoSettings()` only saves when no settings exist

### 4. Debug Log Tests

**File:** `tests/unit/debug-log.test.js`

**Steps:**
1. Run: `npx vitest run tests/unit/debug-log.test.js`
2. Verify: Functions log when `debugMode` is `true`
3. Verify: Functions do not log when `debugMode` is `false`
4. Verify: Timer functions start/end correctly

### 5. Editor Manager Tests

**File:** `tests/unit/editor-manager.test.js`

**Steps:**
1. Run: `npx vitest run tests/unit/editor-manager.test.js`
2. Verify: `EditorManager` initializes with correct defaults
3. Verify: `switchToSource()` updates UI and sets `isSourceMode = true`
4. Verify: `switchToVisual()` initializes Milkdown editor
5. Verify: Content is preserved across mode switches

### 6. TTS Controller Tests

**File:** `tests/unit/tts-controller.test.js`

**Steps:**
1. Run: `npx vitest run tests/unit/tts-controller.test.js`
2. Verify: `setActiveEngine()` switches between webspeech/kokoro
3. Verify: `speakWithWebSpeech()` creates SpeechSynthesisUtterance
4. Verify: `speakWithKokoro()` calls KokoroPlayer with correct parameters
5. Verify: `stopWebSpeech()` cancels speech synthesis
6. Verify: `stopKokoro()` stops Kokoro player

### 7. Voice Manager Tests

**File:** `tests/unit/voice-manager.test.js`

**Steps:**
1. Run: `npx vitest run tests/unit/voice-manager.test.js`
2. Verify: `loadWebSpeechVoices()` populates voice select options
3. Verify: `loadWebSpeechVoices()` restores saved voice
4. Verify: `loadKokoroVoices()` populates Kokoro voice options
5. Verify: Default voice is selected when no saved voice

### 8. UI Manager Tests

**File:** `tests/unit/ui-manager.test.js`

**Steps:**
1. Run: `npx vitest run tests/unit/ui-manager.test.js`
2. Verify: `initThemeToggle()` toggles dark class and saves to localStorage
3. Verify: `initHelpModal()` sets up modal event handlers
4. Verify: `setUIState()` updates play/stop icons correctly

### 9. Editor Modes Integration Tests

**File:** `tests/integration/editor-modes.test.js`

**Steps:**
1. Run: `npx vitest run tests/integration/editor-modes.test.js`
2. Verify: Content remains consistent across multiple mode switches
3. Verify: Source value updates when switching from Visual to Source
4. Verify: CSS classes are applied correctly

### 10. Settings Persistence Flow Integration Tests

**File:** `tests/integration/settings-persistence-flow.test.js`

**Steps:**
1. Run: `npx vitest run tests/integration/settings-persistence-flow.test.js`
2. Verify: Full save-load-reset cycle works correctly
3. Verify: Settings persist across simulated page reloads
4. Verify: Separate voices are maintained for each engine
5. Verify: Corrupt settings data is handled gracefully

## Automated Test Harness

The automated test harness is configured via npm scripts in `package.json`:

### Run All Tests (Harness)

```bash
npm test
```

**Output:**
- Console output with test results
- Coverage report in `coverage/` directory
- TestLog.json generated in project root

### Test Report Format

Tests output results in the following format:
```
Test Suites: X passed, Y failed
Tests:       X passed, Y failed
Snapshots:   0 total
Time:        Xs
Ran all test suites.
```

## Coverage Goals

| Module | Target Coverage |
|--------|----------------|
| `src/global-switches.js` | 100% |
| `src/highlighting-utils.js` | 100% |
| `src/settings-persistence.js` | 95%+ |
| `src/debug-log.js` | 100% |
| `src/ui-manager.js` | 90%+ |
| `src/voice-manager.js` | 90%+ |
| `src/editor-manager.js` | 85%+ |
| `src/tts-controller.js` | 85%+ |
| **Overall** | **80%+** |

## Mocking Strategy

| Dependency | Mock Method |
|------------|-------------|
| Milkdown Editor | Mock module exports with vi.fn() |
| Web Speech API | Mock `speechSynthesis` and `SpeechSynthesisUtterance` |
| localStorage | Mock with vi.fn() for getItem/setItem/removeItem |
| Kokoro TTS | Mock `global.kokoro` with vi.fn() |
| DOM Selection | Mock `window.getSelection()` |
| Console Methods | Spy with vi.spyOn() |

## Continuous Integration

Tests should be run before committing:

```bash
npm run test:coverage
```

Check coverage report to ensure minimum coverage requirements are met.

## Troubleshooting

### Common Issues

1. **Module not found errors:** Ensure dependencies are installed with `npm install`
2. **DOM API errors:** Verify `happy-dom` environment is configured in `vitest.config.js`
3. **localStorage mock errors:** Check `tests/setup.js` for proper localStorage mocking
4. **Vite import errors:** Ensure `vitest.config.js` has correct Vite configuration

### Getting Help

- Check Vitest documentation: https://vitest.dev/
- Check Vite documentation: https://vitejs.dev/
