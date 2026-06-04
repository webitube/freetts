# Integration Tests

Integration tests verify that multiple modules work together correctly, simulating real user workflows.

## Test Files

| File | Scenario |
|------|----------|
| `editor-modes.test.js` | Full editor mode switching cycle |
| `settings-persistence-flow.test.js` | Complete save/reload/restore cycle |

## Running Integration Tests

```bash
# All integration tests
npx vitest run tests/integration/

# Specific test
npx vitest run tests/integration/editor-modes.test.js
```

## Editor Modes Flow

Tests the complete lifecycle of editor mode switching:

1. **Initialization:** App starts in Source mode with initial Markdown.
2. **Switch to Visual:** Markdown is synced to Milkdown editor.
3. **Edit in Visual:** Changes are made in WYSIWYG mode.
4. **Sync to Source:** Visual changes are reflected in the textarea.
5. **Switch to Source:** Editor returns to Source mode with updated content.
6. **State Verification:** AppStore reflects the correct mode and content.

```javascript
describe('Editor Modes Integration', () => {
    it('should preserve content across mode switches', async () => {
        const initialMarkdown = '# Hello\n\n**World**';
        const editor = new EditorManager(elements, initialMarkdown);

        // Start in Source mode
        expect(AppStore.instance.isSourceMode.get()).toBe(true);

        // Switch to Visual
        await editor.switchToVisual();
        expect(AppStore.instance.isSourceMode.get()).toBe(false);

        // Edit in Visual mode (simulated)
        const editedMarkdown = '# Hello\n\n**World**\n\n*New paragraph*';
        editor.setMarkdown(editedMarkdown);

        // Switch back to Source
        editor.switchToSource();
        expect(AppStore.instance.isSourceMode.get()).toBe(true);
        expect(AppStore.instance.currentMarkdown.get()).toBe(editedMarkdown);
    });
});
```

## Settings Persistence Flow

Tests the complete settings lifecycle:

1. **Initial State:** No settings in localStorage.
2. **Save Settings:** User changes engine, voice, speed, pitch, theme.
3. **Persist:** Settings are saved to localStorage.
4. **Simulate Reload:** AppStore is reset (simulating page reload).
5. **Restore:** Settings are loaded from localStorage.
6. **Verification:** All settings match the original values.

```javascript
describe('Settings Persistence Flow', () => {
    it('should survive reload cycle', () => {
        // Set settings
        AppStore.instance.engine.set(EngineEnum.Kokoro);
        AppStore.instance.voice.set('af_heart');
        AppStore.instance.speed.set(1.5);
        AppStore.instance.pitch.set(1.2);
        AppStore.instance.theme.set(ThemeEnum.Dark);

        // Save
        AppStore.instance.saveToLocalStorage();

        // Simulate reload
        const saved = localStorage.getItem('freetts-settings');
        expect(saved).not.toBe(null);

        // Restore
        AppStore.instance.loadFromLocalStorage();

        // Verify
        expect(AppStore.instance.engine.get()).toBe(EngineEnum.Kokoro);
        expect(AppStore.instance.voice.get()).toBe('af_heart');
        expect(AppStore.instance.speed.get()).toBe(1.5);
        expect(AppStore.instance.pitch.get()).toBe(1.2);
        expect(AppStore.instance.theme.get()).toBe(ThemeEnum.Dark);
    });
});
```

## Cross-Module Integration

Integration tests also verify cross-module interactions:

- **AppStore ↔ EditorManager:** Mode and content synchronization.
- **AppStore ↔ TTSController:** Playback state updates.
- **AppStore ↔ SettingsPersistence:** Auto-save on every change.
- **AppStore ↔ VoiceManager:** Voice list updates trigger UI refresh.
- **AppStore ↔ UIManager:** Theme changes update DOM classes.
