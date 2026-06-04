# AppUtils API

Helper functions for status messages, UI toggling, and engine selection.

## Functions

### updateStatusMsg

```typescript
function updateStatusMsg(
    status: HTMLElement | undefined,
    msg: string,
    device?: string
): void
```

Updates the status message element with a message and device indicator.

### resetStatusAfterDelay

```typescript
function resetStatusAfterDelay(
    statusCallback: (msg: string) => void,
    delay = 2000,
    readyMessage = 'Ready.'
): void
```

Resets the status message after a delay.

### toggleHidden

```typescript
function toggleHidden(
    element: HTMLElement | null | undefined,
    hidden: boolean
): void
```

Toggles the `hidden` CSS class on an element.

### capitalizeMsg

```typescript
function capitalizeMsg(original: string): string
```

Capitalizes the first character of a string.

### getSelectedEngine

```typescript
function getSelectedEngine(): [string, string]
```

Gets the currently selected TTS engine from the dropdown.

### updateSelectedEngine

```typescript
function updateSelectedEngine(activeDevice?: string): void
```

Updates the active device message element.
