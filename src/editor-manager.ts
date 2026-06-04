import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core';
import { nord } from '@milkdown/theme-nord';
import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';
import { history } from '@milkdown/plugin-history';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { replaceAll } from '@milkdown/utils';

import { AppStore } from './app-store';

/**
 * EditorManager handles Milkdown editor initialization and mode switching
 * between Reveal Codes (textarea) and Visual (WYSIWYG) modes.
 * Now backed by AppStore reactive state.
 *
 * @example
 * ```ts
 * const editor = new EditorManager(elements, initialMarkdown);
 * await editor.switchToVisual();  // Switch to WYSIWYG mode
 * editor.switchToSource();        // Switch to raw textarea mode
 * ```
 */
export class EditorManager {
    private elements: Record<string, unknown>;
    private initialValue: string;
    private milkdownEditor: any = null;

    /**
     * Create a new EditorManager instance.
     *
     * @param elements - DOM elements map (source, visual, container, btnSource, btnVisual).
     * @param initialValue - Initial Markdown content to load.
     */
    constructor(elements: Record<string, unknown>, initialValue: string) {
        this.elements = elements;
        this.initialValue = initialValue;
        AppStore.instance.currentMarkdown.set(initialValue);
        AppStore.instance.isSourceMode.set(true);
    }

    /**
     * Create the Milkdown editor instance with all required plugins.
     * Configures Nord theme, CommonMark, GFM, history, and listener plugins.
     * Syncs markdown updates back to AppStore and the source textarea.
     *
     * @returns A promise that resolves when the editor is created.
     */
    async createEditor(): Promise<void> {
        const visualEl = (this.elements as any).visual as HTMLElement;
        this.milkdownEditor = await Editor.make()
            .config((ctx: any) => {
                ctx.set(rootCtx, visualEl);
                ctx.set(defaultValueCtx, AppStore.instance.currentMarkdown.get());
                ctx.get(listenerCtx).markdownUpdated((_ctx: any, markdown: string) => {
                    AppStore.instance.currentMarkdown.set(markdown);
                    const sourceEl = (this.elements as any).source as HTMLTextAreaElement;
                    if (sourceEl) sourceEl.value = markdown;
                });
            })
            .use(nord)
            .use(commonmark)
            .use(gfm)
            .use(history)
            .use(listener)
            .create();
    }

    /**
     * Switch to Visual (WYSIWYG) mode.
     * Lazily initializes Milkdown on first switch, otherwise replaces content.
     *
     * @returns A promise that resolves when the switch is complete.
     */
    async switchToVisual(): Promise<void> {
        if (AppStore.instance.isSourceMode.get()) {
            const sourceEl = (this.elements as any).source as HTMLTextAreaElement;
            AppStore.instance.currentMarkdown.set(sourceEl?.value ?? AppStore.instance.currentMarkdown.get());
            AppStore.instance.isSourceMode.set(false);

            const container = (this.elements as any).container as HTMLElement;
            const btnSource = (this.elements as any).btnSource as HTMLElement;
            const btnVisual = (this.elements as any).btnVisual as HTMLElement;

            if (container) container.classList.remove('source-mode');
            if (btnSource) btnSource.classList.remove('active-tab');
            if (btnVisual) btnVisual.classList.add('active-tab');

            if (!this.milkdownEditor) {
                await this.createEditor();
            } else {
                this.milkdownEditor.action(replaceAll(AppStore.instance.currentMarkdown.get()));
            }
        }
    }

    /**
     * Switch to Source (Reveal Codes) mode.
     * Syncs current Markdown content to the textarea.
     */
    switchToSource(): void {
        if (!AppStore.instance.isSourceMode.get()) {
            AppStore.instance.isSourceMode.set(true);

            const container = (this.elements as any).container as HTMLElement;
            const btnVisual = (this.elements as any).btnVisual as HTMLElement;
            const btnSource = (this.elements as any).btnSource as HTMLElement;
            const sourceEl = (this.elements as any).source as HTMLTextAreaElement;

            if (container) container.classList.add('source-mode');
            if (btnVisual) btnVisual.classList.remove('active-tab');
            if (btnSource) btnSource.classList.add('active-tab');
            if (sourceEl) sourceEl.value = AppStore.instance.currentMarkdown.get();
        }
    }

    /**
     * Get the current Markdown content from AppStore.
     * @returns Current Markdown string
     */
    getCurrentMarkdown(): string {
        return AppStore.instance.currentMarkdown.get();
    }

    /**
     * Set the current Markdown content in AppStore.
     * @param markdown - Markdown string to set
     */
    setCurrentMarkdown(markdown: string): void {
        AppStore.instance.currentMarkdown.set(markdown);
    }

    /**
     * Check if the editor is currently in Source mode.
     * @returns True if in Source (Reveal Codes) mode, false if in Visual mode
     */
    isCurrentlySourceMode(): boolean {
        return AppStore.instance.isSourceMode.get();
    }

    /**
     * Get the underlying Milkdown editor instance.
     * @returns Milkdown editor instance, or null if not yet initialized
     */
    getEditor(): any {
        return this.milkdownEditor;
    }
}
