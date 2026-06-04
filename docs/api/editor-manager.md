# EditorManager API

The `EditorManager` class handles switching between Source (textarea) and Visual (Milkdown WYSIWYG) editor modes.

## Constructor

```typescript
constructor(
    elements: Record<string, unknown>,  // DOM elements map
    initialValue: string,                // Initial Markdown content
)
```

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `elements` | `Record<string, unknown>` | DOM elements map |
| `initialValue` | `string` | Initial Markdown content |
| `milkdownEditor` | `any` | Milkdown editor instance (lazy) |

## Methods

| Method | Description |
|--------|-------------|
| `createEditor()` | Initialize Milkdown editor with plugins |
| `switchToVisual()` | Switch to Visual (WYSIWYG) mode |
| `switchToSource()` | Switch to Source (textarea) mode |
| `getMarkdown()` | Get current Markdown content |
| `setMarkdown(markdown)` | Set Markdown content |

## Milkdown Configuration

```typescript
await Editor.make()
    .config((ctx) => {
        ctx.set(rootCtx, visualElement);
        ctx.set(defaultValueCtx, markdownContent);
        ctx.get(listenerCtx).markdownUpdated((_ctx, markdown) => {
            AppStore.instance.currentMarkdown.set(markdown);
            sourceElement.value = markdown;
        });
    })
    .use(nord)
    .use(commonmark)
    .use(gfm)
    .use(history)
    .use(listener)
    .create();
```

## Plugins

| Plugin | Purpose |
|--------|---------|
| `nord` | Nord visual theme |
| `commonmark` | CommonMark syntax |
| `gfm` | GitHub Flavored Markdown |
| `history` | Undo/redo |
| `listener` | Markdown update events |
