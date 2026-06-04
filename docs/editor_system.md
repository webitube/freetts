# Editor System

FreeTTS features a dual-mode Markdown editor that switches between a raw Source mode (textarea) and a Visual WYSIWYG mode powered by Milkdown. This document describes the editor architecture and mode switching.

## Editor Modes

### Source Mode (Reveal Codes)

Source mode displays raw Markdown in a `<textarea>` element:

- **Monospace font** for syntax visibility
- **Direct Markdown editing** — no rendering overhead
- **Full control** over formatting syntax
- **Word-level highlighting** during TTS playback on raw text
- **Best for:** Power users who prefer direct Markdown manipulation

```html
<textarea id="source-editor" class="source-editor">
# Heading
**Bold** and *italic* text
</textarea>
```

### Visual Mode (WYSIWYG)

Visual mode renders Markdown as formatted text using the Milkdown editor framework:

- **Real-time rendering** of Markdown syntax
- **Rich text editing** experience
- **Tables, blockquotes, task lists, code blocks** support
- **Nord theme** for a clean, modern appearance
- **Word-level highlighting** during TTS playback on rendered text
- **Best for:** Users who prefer a word-processor-like experience

```html
<div id="app" class="visual-editor"></div>
```

## EditorManager

The `EditorManager` class handles editor initialization and mode switching:

```typescript
class EditorManager {
    constructor(
        elements: Record<string, unknown>,  // DOM elements map
        initialValue: string,                // Initial Markdown content
    ) {}

    async createEditor(): Promise<void>
    async switchToVisual(): Promise<void>
    switchToSource(): void
    getMarkdown(): string
    setMarkdown(markdown: string): void
}
```

### Milkdown Configuration

The Milkdown editor is configured with:

| Plugin | Purpose |
|--------|---------|
| `nord` | Nord visual theme |
| `commonmark` | CommonMark Markdown syntax |
| `gfm` | GitHub Flavored Markdown |
| `history` | Undo/redo support |
| `listener` | Markdown update events |

```typescript
await Editor.make()
    .config((ctx) => {
        ctx.set(rootCtx, visualElement);
        ctx.set(defaultValueCtx, markdownContent);
        ctx.get(listenerCtx).markdownUpdated((_ctx, markdown) => {
            AppStore.instance.currentMarkdown.set(markdown);
            sourceElement.value = markdown;  // Sync to textarea
        });
    })
    .use(nord)
    .use(commonmark)
    .use(gfm)
    .use(history)
    .use(listener)
    .create();
```

## Mode Switching

### Switch to Visual

```typescript
async switchToVisual(): Promise<void> {
    if (AppStore.instance.isSourceMode.get()) {
        // Sync source content to store
        const sourceEl = sourceElement;
        AppStore.instance.currentMarkdown.set(sourceEl?.value ?? currentMarkdown);
        AppStore.instance.isSourceMode.set(false);

        // Lazy initialize Milkdown on first switch
        if (!this.milkdownEditor) {
            await this.createEditor();
        } else {
            // Replace content on subsequent switches
            this.milkdownEditor.dispatch(
                commandCtx.create('setMarkdown', currentMarkdown)
            );
        }

        // Toggle DOM visibility
        sourceElement.classList.add('hidden');
        visualElement.classList.remove('hidden');
        containerElement.classList.add('hidden');
    }
}
```

### Switch to Source

```typescript
switchToSource(): void {
    if (!AppStore.instance.isSourceMode.get()) {
        // Sync Milkdown content to store
        if (this.milkdownEditor) {
            const markdown = this.getMarkdown();
            AppStore.instance.currentMarkdown.set(markdown);
        }
        AppStore.instance.isSourceMode.set(true);

        // Toggle DOM visibility
        sourceElement.classList.remove('hidden');
        visualElement.classList.add('hidden');
        containerElement.classList.remove('hidden');
    }
}
```

## State Synchronization

All editor state flows through `AppStore`:

| Property | Type | Description |
|----------|------|-------------|
| `currentMarkdown` | `ReactiveValue<string>` | Current editor content |
| `isSourceMode` | `ReactiveValue<boolean>` | Current editor mode |

### Visual → Source Sync

When Markdown is edited in Visual mode, the `listener` plugin fires `markdownUpdated` events:

```typescript
ctx.get(listenerCtx).markdownUpdated((_ctx, markdown: string) => {
    AppStore.instance.currentMarkdown.set(markdown);
    const sourceEl = sourceElement;
    if (sourceEl) sourceEl.value = markdown;  // Sync to textarea
});
```

### Source → Visual Sync

When switching from Source to Visual mode, the textarea content is read and set as the Milkdown editor's initial value.

## Markdown Support

FreeTTS supports GitHub Flavored Markdown (GFM) through Milkdown:

| Feature | Support |
|---------|---------|
| Headings (`#`–`######`) | ✅ |
| Bold (`**text**`) | ✅ |
| Italic (`*text*`) | ✅ |
| Strike-through (`~~text~~`) | ✅ |
| Links | ✅ |
| Images | ✅ |
| Code blocks | ✅ |
| Inline code | ✅ |
| Blockquotes | ✅ |
| Unordered lists | ✅ |
| Ordered lists | ✅ |
| Task lists (`[x]`) | ✅ |
| Tables with alignment | ✅ |
| Horizontal rules | ✅ |

## TTS Integration

### Word-Level Highlighting

The `highlighting-utils.ts` module provides utilities for synchronizing spoken words with the editor:

#### Source Mode

In Source mode, highlighting works by tracking character offsets in the raw Markdown text. The TTS engine reports character boundaries, and the corresponding text range is highlighted.

#### Visual Mode

In Visual mode, `highlightVisualWord()` uses a `TreeWalker` to traverse DOM text nodes:

```typescript
export function highlightVisualWord(
    startOffset: number,
    wordLength: number,
    visualElement: HTMLElement
): void {
    const selection = window.getSelection();
    const range = document.createRange();
    let charCount = 0;
    let startNode: Text | null = null;
    let endNode: Text | null = null;

    const walker = document.createTreeWalker(
        visualElement,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );

    // Find the text nodes corresponding to the offset and length
    while ((node = walker.nextNode())) {
        const next = charCount + node.textContent!.length;
        if (!startNode && startOffset >= charCount && startOffset < next) {
            startNode = node as Text;
            startCharIndex = startOffset - charCount;
        }
        if (startNode && (startOffset + wordLength) <= next) {
            endNode = node as Text;
            endCharIndex = (startOffset + wordLength) - charCount;
            break;
        }
        charCount = next;
    }

    // Create selection range
    if (startNode && endNode) {
        range.setStart(startNode, startCharIndex);
        range.setEnd(endNode, endCharIndex);
        selection.removeAllRanges();
        selection.addRange(range);
    }
}
```

### Cursor Information

`getVisualCursorInfo()` retrieves the selected text and its offset from the Visual editor:

```typescript
export function getVisualCursorInfo(
    visualElement: HTMLElement
): { text: string; offset: number } {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) {
        return { text: visualElement.innerText, offset: 0 };
    }

    const range = selection.getRangeAt(0);
    const pre = range.cloneRange();
    pre.selectNodeContents(visualElement);
    pre.setEnd(range.startContainer, range.startOffset);

    return {
        text: visualElement.innerText,
        offset: pre.toString().length
    };
}
```

### Syntax Cleaning

Before TTS playback, Markdown syntax is stripped via `cleanMarkdown()`:

```typescript
// Input:  "## **Hello** World\n### *Italic* text"
// Output: "Hello World Italic text"
export function cleanMarkdown(text: string): string {
    return text
        .replace(/#{1,6}\s/g, '')           // Remove headings
        .replace(/\*\*(.*?)\*\*/g, '$1')    // Remove bold markers
        .replace(/\*(.*?)\*/g, '$1')        // Remove italic markers
        .replace(/~~(.*?)~~/g, '$1')        // Remove strike-through
        .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Replace links with text
        .replace(/`([^`]+)`/g, '$1')        // Remove inline code markers
        .replace(/>\s/g, '')                // Remove blockquote markers
        .replace(/[-*+]\s/g, '')            // Remove list markers
        .replace(/\|[- :]+\|/g, '')         // Remove table separators
        .replace(/\|/g, '')                 // Remove table pipes
        .replace(/\[x\]/g, '')              // Remove task list markers
        .replace(/\[ \]/g, '')
        .replace(/\n{3,}/g, '\n\n')         // Normalize whitespace
        .trim();
}
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` / `Cmd+Enter` | Toggle TTS playback |

## DOM Elements

| Element ID | Type | Purpose |
|------------|------|---------|
| `source-editor` | `textarea` | Source mode editor |
| `app` | `div` | Visual mode editor container |
| `container` | `div` | Editor mode toggle container |
| `btn-source` | `button` | Switch to Source mode |
| `btn-visual` | `button` | Switch to Visual mode |
## Related Documentation

- **[DevOps Guide](DEVOPS.md)** — Building, testing, and deployment.
- **[TypeScript API: EditorManager](api/editor-manager.md)** — Detailed EditorManager API.
- **[Architecture Overview](app_logic.md)** — System architecture and module design.
- **[Testing: Editor Modes](testing/unit-tests.md)** — Editor mode unit tests.