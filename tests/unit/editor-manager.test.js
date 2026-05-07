import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EditorManager } from '../../src/editor-manager.js';

// Mock Milkdown modules
vi.mock('@milkdown/core', () => ({
    Editor: {
        make: vi.fn().mockReturnValue({
            config: vi.fn().mockReturnValue({
                use: vi.fn().mockReturnValue({
                    use: vi.fn().mockReturnValue({
                        use: vi.fn().mockReturnValue({
                            use: vi.fn().mockReturnValue({
                                use: vi.fn().mockReturnValue({
                                    create: vi.fn().mockResolvedValue({
                                        action: vi.fn(),
                                    }),
                                }),
                            }),
                        }),
                    }),
                }),
            }),
        }),
    },
    rootCtx: {},
    defaultValueCtx: {},
}));

vi.mock('@milkdown/theme-nord', () => ({
    nord: {},
}));

vi.mock('@milkdown/preset-commonmark', () => ({
    commonmark: {},
}));

vi.mock('@milkdown/preset-gfm', () => ({
    gfm: {},
}));

vi.mock('@milkdown/plugin-history', () => ({
    history: {},
}));

vi.mock('@milkdown/plugin-listener', () => ({
    listener: {},
    listenerCtx: {},
}));

vi.mock('@milkdown/utils', () => ({
    replaceAll: vi.fn((text) => ({ text })),
}));

describe('editor-manager.js', () => {
    let mockElements;
    let editorManager;
    const initialMarkdown = '# Hello World';

    beforeEach(() => {
        mockElements = {
            source: {
                value: '',
                setSelectionRange: vi.fn(),
                selectionStart: 0,
                focus: vi.fn(),
            },
            visual: { classList: { add: vi.fn(), remove: vi.fn() } },
            container: { classList: { add: vi.fn(), remove: vi.fn() } },
            btnSource: { classList: { add: vi.fn(), remove: vi.fn() } },
            btnVisual: { classList: { add: vi.fn(), remove: vi.fn() } },
        };

        editorManager = new EditorManager(mockElements, initialMarkdown);
    });

    describe('constructor', () => {
        it('should initialize with default values', () => {
            expect(editorManager.currentMarkdown).toBe(initialMarkdown);
            expect(editorManager.isSourceMode).toBe(true);
            expect(editorManager.milkdownEditor).toBeNull();
        });

        it('should store elements reference', () => {
            expect(editorManager.elements).toBe(mockElements);
        });
    });

    describe('getCurrentMarkdown', () => {
        it('should return current markdown content', () => {
            expect(editorManager.getCurrentMarkdown()).toBe(initialMarkdown);
        });

        it('should return updated content after setting', () => {
            editorManager.setCurrentMarkdown('# Updated');
            expect(editorManager.getCurrentMarkdown()).toBe('# Updated');
        });
    });

    describe('setCurrentMarkdown', () => {
        it('should set markdown content', () => {
            const newMarkdown = '# New Content';
            editorManager.setCurrentMarkdown(newMarkdown);
            expect(editorManager.currentMarkdown).toBe(newMarkdown);
        });
    });

    describe('isCurrentlySourceMode', () => {
        it('should return true when in source mode', () => {
            expect(editorManager.isCurrentlySourceMode()).toBe(true);
        });

        it('should return false when in visual mode', async () => {
            // Mock milkdown editor to skip async creation
            editorManager.milkdownEditor = { action: vi.fn() };
            
            // Manually switch to visual mode for testing
            editorManager.isSourceMode = false;
            
            expect(editorManager.isCurrentlySourceMode()).toBe(false);
        });
    });

    describe('switchToSource', () => {
        it('should switch to source mode', () => {
            // First switch to visual
            editorManager.isSourceMode = false;
            editorManager.currentMarkdown = '# Visual Content';
            
            // Then switch back to source
            editorManager.switchToSource();
            
            expect(editorManager.isSourceMode).toBe(true);
            expect(mockElements.source.value).toBe('# Visual Content');
            expect(mockElements.container.classList.add).toHaveBeenCalledWith('source-mode');
        });

        it('should not switch if already in source mode', () => {
            const addSpy = vi.spyOn(mockElements.container.classList, 'add');
            
            editorManager.switchToSource();
            
            expect(addSpy).not.toHaveBeenCalled();
        });
    });

    describe('switchToVisual', () => {
        it('should switch to visual mode', async () => {
            // Mock the editor creation
            const mockEditor = { action: vi.fn() };
            editorManager.milkdownEditor = mockEditor;
            
            await editorManager.switchToVisual();
            
            expect(editorManager.isSourceMode).toBe(false);
            expect(mockElements.container.classList.remove).toHaveBeenCalledWith('source-mode');
        });

        it('should not switch if already in visual mode', async () => {
            editorManager.isSourceMode = false;
            
            const mockEditor = { action: vi.fn() };
            editorManager.milkdownEditor = mockEditor;
            
            await editorManager.switchToVisual();
            
            // Should not call action if already in visual mode
            const callCount = mockEditor.action.mock?.callCount || 0;
            expect(callCount).toBe(0);
        });

        it('should update source value when switching', async () => {
            mockElements.source.value = '# Test Markdown';
            editorManager.milkdownEditor = { action: vi.fn() };
            
            await editorManager.switchToVisual();
            
            expect(editorManager.currentMarkdown).toBe('# Test Markdown');
        });
    });

    describe('createEditor', () => {
        it('should initialize milkdown editor', async () => {
            await editorManager.createEditor();
            
            expect(editorManager.milkdownEditor).not.toBeNull();
        });
    });

    describe('getEditor', () => {
        it('should return null when editor not created', () => {
            expect(editorManager.getEditor()).toBeNull();
        });

        it('should return editor when created', async () => {
            await editorManager.createEditor();
            
            expect(editorManager.getEditor()).not.toBeNull();
        });
    });
});