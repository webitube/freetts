# UIManager API

UI state management for theme toggling, modal management, and playback controls.

## Functions

### initThemeToggle

```typescript
function initThemeToggle(themeToggle: HTMLElement | null): void
```

Initialize theme toggle functionality. Switches between Light and Dark themes.

### updatePlaybackControls

```typescript
function updatePlaybackControls(
    elements: Record<string, HTMLElement>,
    active: boolean
): void
```

Update playback controls based on speaking state (play/stop icons).

### resetStatusAfterDelay

```typescript
function resetStatusAfterDelay(
    statusCallback: (msg: string) => void,
    delay = 2000,
    readyMessage = 'Ready.'
): void
```

Reset status message after a delay.

### initHelpModal

```typescript
function initHelpModal(elements: Record<string, HTMLElement>): void
```

Initialize help modal functionality (open/close Markdown cheatsheet).

### initClipboardAndDownload

```typescript
function initClipboardAndDownload(elements: Record<string, HTMLElement>): void
```

Initialize clipboard copy and Markdown download functionality.

### setUIState

```typescript
function setUIState(active: boolean): void
```

Set the UI speaking state (updates playback button colors).

## Theme Management

```typescript
const currentTheme = AppStore.instance.theme.get();
const isDark = currentTheme === ThemeEnum.Dark;
const newTheme = isDark ? ThemeEnum.Light : ThemeEnum.Dark;
AppStore.instance.theme.set(newTheme);
document.documentElement.classList.toggle('dark', newTheme === ThemeEnum.Dark);
```

## DOM Elements

| Element ID | Purpose |
|------------|---------|
| `theme-toggle` | Theme toggle button |
| `play-icon` | Play button icon |
| `stop-icon` | Stop button icon |
| `btn-tts` | TTS playback button |
| `help-modal` | Help modal container |
| `help-toggle` | Help modal trigger |
| `help-close-btn` | Help modal close button |
| `help-close-footer` | Help modal footer close |
| `btn-copy` | Copy to clipboard button |
| `btn-download` | Download Markdown button |
