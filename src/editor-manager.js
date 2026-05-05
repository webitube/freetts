import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core';
import { nord } from '@milkdown/theme-nord';
import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';
import { history } from '@milkdown/plugin-history';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { replaceAll } from '@milkdown/utils';

/**
 * EditorManager handles Milkdown editor initialization and mode switching
 * between Reveal Codes (textarea) and Visual (WYSIWYG) modes.
 */
export class EditorManager {
    /**
     * @param {Object} elements - DOM elements object
     * @param {string} initialValue - Initial Markdown content
     */
    constructor(elements, initialValue) {
        this.elements = elements;
        this.initialValue = initialValue;
        this.currentMarkdown = initialValue;
        this.milkdownEditor = null;
        this.isSourceMode = true;
    }

    /**
     * Initialize the Milkdown editor
     * @returns {Promise<void>}
     */
    async createEditor() {
        this.milkdownEditor = await Editor.make()
            .config((ctx) => {
                ctx.set(rootCtx, this.elements.visual);
                ctx.set(defaultValueCtx, this.currentMarkdown);
                ctx.get(listenerCtx).markdownUpdated((ctx, markdown) => {
                    this.currentMarkdown = markdown;
                    this.elements.source.value = markdown;
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
     * Switch to Visual mode (WYSIWYG editor)
     * @returns {Promise<void>}
     */
    async switchToVisual() {
        if (!this.isSourceMode) return;
        
        this.isSourceMode = false;
        this.currentMarkdown = this.elements.source.value;
        this.elements.container.classList.remove('source-mode');
        this.elements.btnSource.classList.remove('active-tab');
        this.elements.btnVisual.classList.add('active-tab');
        
        if (!this.milkdownEditor) {
            await this.createEditor();
        } else {
            this.milkdownEditor.action(replaceAll(this.currentMarkdown));
        }
    }

    /**
     * Switch to Source mode (textarea)
     */
    switchToSource() {
        if (this.isSourceMode) return;
        
        this.isSourceMode = true;
        this.elements.container.classList.add('source-mode');
        this.elements.btnVisual.classList.remove('active-tab');
        this.elements.btnSource.classList.add('active-tab');
        this.elements.source.value = this.currentMarkdown;
    }

    /**
     * Get current Markdown content
     * @returns {string}
     */
    getCurrentMarkdown() {
        return this.currentMarkdown;
    }

    /**
     * Set Markdown content
     * @param {string} markdown - Markdown content to set
     */
    setCurrentMarkdown(markdown) {
        this.currentMarkdown = markdown;
    }

    /**
     * Check if currently in Source mode
     * @returns {boolean}
     */
    isCurrentlySourceMode() {
        return this.isSourceMode;
    }

    /**
     * Get the Milkdown editor instance
     * @returns {Editor|null}
     */
    getEditor() {
        return this.milkdownEditor;
    }
}
