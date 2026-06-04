# HighlightingUtils API

Utility functions for text selection and word-level highlighting in both Source and Visual modes.

## Functions

### highlightVisualWord

```typescript
function highlightVisualWord(
    startOffset: number,
    wordLength: number,
    visualElement: HTMLElement
): void
```

Highlights a word in Visual mode using TreeWalker to traverse DOM text nodes.

### getVisualCursorInfo

```typescript
function getVisualCursorInfo(
    visualElement: HTMLElement
): { text: string; offset: number }
```

Gets cursor information from Visual mode — selected text and its offset.

### cleanMarkdown

```typescript
function cleanMarkdown(text: string): string
```

Strips Markdown syntax from text for TTS playback.

Removes: headings, bold, italic, strike-through, links, inline code, blockquotes, list markers, table pipes, task list markers.

## Usage

```typescript
// Highlight spoken word in visual editor
highlightVisualWord(charOffset, wordLength, visualElement);

// Get current selection info
const { text, offset } = getVisualCursorInfo(visualElement);

// Clean text for TTS
const spokenText = cleanMarkdown(rawMarkdown);
```
