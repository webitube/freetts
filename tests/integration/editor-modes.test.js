import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EditorManager } from '../../src/editor-manager.js';
import { AppStore } from '../../src/app-store';

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

vi.mock('@milkdown/theme-nord', () => ({ nord: {} }));
vi.mock('@milkdown/preset-commonmark', () => ({ commonmark: {} }));
vi.mock('@milkdown/preset-gfm', () => ({ gfm: {} }));
vi.mock('@milkdown/plugin-history', () => ({ history: {} }));
vi.mock('@milkdown/plugin-listener', () => ({ listener: {}, listenerCtx: {} }));
vi.mock('@milkdown/utils', () => ({
    replaceAll: vi.fn((text) => ({ text })),
}));

describe('Integration: Editor Modes', () => {
    let editorManager;
    let mockElements;

    beforeEach(() => {
        mockElements = {
            source: {
                value: '# Initial Content',
                setSelectionRange: vi.fn(),
                selectionStart: 0,
                focus: vi.fn(),
            },
            visual: { classList: { add: vi.fn(), remove: vi.fn() } },
            container: { classList: { add: vi.fn(), remove: vi.fn() } },
            btnSource: { classList: { add: vi.fn(), remove: vi.fn() } },
            btnVisual: { classList: { add: vi.fn(), remove: vi.fn() } },
        };

        editorManager = new EditorManager(mockElements, '# Initial Content');
    });

    describe('Mode Switching Flow', () => {
        it('should maintain content consistency when switching modes', () => {
            const initialContent = '# Hello\n\n**World**';
            mockElements.source.value = initialContent; // Sync mock with initial content
            editorManager = new EditorManager(mockElements, initialContent);
            
            // Start in source mode
            expect(editorManager.isCurrentlySourceMode()).toBe(true);
            expect(editorManager.getCurrentMarkdown()).toBe(initialContent);
            
            // Switch to visual
            editorManager.milkdownEditor = { action: vi.fn() };
            editorManager.switchToVisual();
            expect(editorManager.isCurrentlySourceMode()).toBe(false);
            
            // Switch back to source
            editorManager.switchToSource();
            expect(editorManager.isCurrentlySourceMode()).toBe(true);
            
            // Content should be preserved
            expect(editorManager.getCurrentMarkdown()).toBe(initialContent);
        });

        it('should update source value when switching from visual to source', () => {
            // EditorManager now uses AppStore for state
            AppStore.instance.currentMarkdown.set('# Updated in Visual');
            AppStore.instance.isSourceMode.set(false);
            
            editorManager.switchToSource();
            
            expect(mockElements.source.value).toBe('# Updated in Visual');
        });

        it('should toggle class lists correctly on mode switches', () => {
            // Switch to visual
            editorManager.milkdownEditor = { action: vi.fn() };
            editorManager.switchToVisual();
            
            expect(mockElements.container.classList.remove).toHaveBeenCalledWith('source-mode');
            expect(mockElements.btnVisual.classList.add).toHaveBeenCalledWith('active-tab');
            expect(mockElements.btnSource.classList.remove).toHaveBeenCalledWith('active-tab');
            
            // Switch back to source
            editorManager.switchToSource();
            
            expect(mockElements.container.classList.add).toHaveBeenCalledWith('source-mode');
            expect(mockElements.btnSource.classList.add).toHaveBeenCalledWith('active-tab');
            expect(mockElements.btnVisual.classList.remove).toHaveBeenCalledWith('active-tab');
        });
    });

    describe('Content Sync', () => {
        it('should preserve markdown content through multiple switches', async () => {
            const content = '# Test\n\n## Subheading\n\n- Item 1\n- Item 2';
            mockElements.source.value = content; // Sync mock with initial content
            editorManager = new EditorManager(mockElements, content);
            
            // Switch to visual and back multiple times
            editorManager.milkdownEditor = { action: vi.fn() };
            
            for (let i = 0; i < 3; i++) {
                editorManager.switchToVisual();
                editorManager.switchToSource();
            }
            
            expect(editorManager.getCurrentMarkdown()).toBe(content);
        });

        it('should handle empty content', () => {
            editorManager = new EditorManager(mockElements, '');
            
            expect(editorManager.getCurrentMarkdown()).toBe('');
            
            editorManager.setCurrentMarkdown('# New Content');
            expect(editorManager.getCurrentMarkdown()).toBe('# New Content');
        });
    });

    describe('Source Mode Operations', () => {
        it('should update source value when in source mode', () => {
            expect(editorManager.isCurrentlySourceMode()).toBe(true);
            
            mockElements.source.value = '# Modified in Source';
            editorManager.switchToSource(); // No-op but verifies state
            
            expect(editorManager.isCurrentlySourceMode()).toBe(true);
        });

        it('should not add source-mode class when already in source mode', () => {
            const addSpy = vi.spyOn(mockElements.container.classList, 'add');
            
            editorManager.switchToSource();
            
            // Should not call add since already in source mode
            expect(addSpy).not.toHaveBeenCalled();
        });
    });
});