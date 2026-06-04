# TypeScript API Reference

This page contains the API reference documentation for the FreeTTS TypeScript codebase.

## app.ts — Application Entry Point

Main initialization module that orchestrates all other modules.

### Responsibilities

- DOM element references
- Browser detection (Safari, mobile)
- Module instantiation (AppStore, EditorManager, TTSController, KokoroPlayer)
- Event handler binding
- State synchronization via AppStore
- Keyboard shortcut handling (`Ctrl+Enter` / `Cmd+Enter`)

### Initialization Flow

```typescript
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Load default text
    const defaultText = await fetch('DefaultText.md').then(r => r.text());
    
    // 2. Detect browser
    const isSafari = /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent);
    const isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    // 3. Reference DOM elements
    const elements = {
        source: document.getElementById('source-editor'),
        visual: document.getElementById('app'),
        // ... more elements
    };
    
    // 4. Initialize modules
    const store = AppStore.instance;
    const editor = new EditorManager(elements, defaultText);
    const ttsController = new TTSController(elements, editor, kokoroPlayer, ...);
    
    // 5. Bind events and start
});
```

### Key Imports

```typescript
import { EditorManager } from './editor-manager';
import { TTSController } from './tts-controller';
import { KokoroPlayer } from './kokoro-player';
import { AppStore } from './app-store';
import { highlightVisualWord, getVisualCursorInfo } from './highlighting-utils';
import { saveTTSSettings, loadTTSSettings } from './settings-persistence';
import { initThemeToggle, initHelpModal } from './ui-manager';
import { loadWebSpeechVoices, loadKokoroVoices } from './voice-manager';
```

