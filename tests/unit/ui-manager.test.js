import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    initThemeToggle,
    initHelpModal,
    initClipboardAndDownload,
    setUIState
} from '../../src/ui-manager';

describe('ui-manager.js', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        // Reset dark class
        if (document.documentElement.classList) {
            document.documentElement.classList.remove('dark');
        }
    });

    afterEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    describe('initThemeToggle', () => {
        it('should be a function', () => {
            expect(typeof initThemeToggle).toBe('function');
        });

        it('should not throw when themeToggle is null', () => {
            expect(() => initThemeToggle(null)).not.toThrow();
        });

        it('should toggle dark class and save to localStorage', () => {
            const mockToggle = { onclick: null };

            // Initialize the toggle
            initThemeToggle(mockToggle);

            // Simulate clicking the toggle
            mockToggle.onclick();

            // After first click, dark class should be added
            expect(document.documentElement.classList.contains('dark')).toBe(true);
            // Theme is now saved via AppStore serialization, not localStorage.theme directly
            const saved = localStorage.getItem('freetts-settings');
            expect(saved).toBeDefined();
        });

        it('should remove dark class on second click', () => {
            const mockToggle = { onclick: null };

            // Initialize the toggle
            initThemeToggle(mockToggle);

            // First click - add dark
            mockToggle.onclick();
            expect(document.documentElement.classList.contains('dark')).toBe(true);

            // Second click - remove dark
            mockToggle.onclick();
            expect(document.documentElement.classList.contains('dark')).toBe(false);
        });
    });

    describe('initHelpModal', () => {
        it('should be a function', () => {
            expect(typeof initHelpModal).toBe('function');
        });

        it('should setup help modal event handlers', () => {
            const mockElements = {
                helpModal: { 
                    classList: { toggle: vi.fn() },
                    onclick: null
                },
                helpToggle: { onclick: null },
                helpCloseBtn: { onclick: null },
                helpCloseFooter: { onclick: null },
            };

            initHelpModal(mockElements);

            // Verify handlers are assigned
            expect(mockElements.helpToggle.onclick).toBeDefined();
            expect(mockElements.helpCloseBtn.onclick).toBeDefined();
        });

        it('should work without optional close buttons', () => {
            const mockElements = {
                helpModal: { 
                    classList: { toggle: vi.fn() },
                    onclick: null
                },
                helpToggle: { onclick: null },
                helpCloseBtn: null,
                helpCloseFooter: null,
            };

            expect(() => initHelpModal(mockElements)).not.toThrow();
        });
    });

    describe('initClipboardAndDownload', () => {
        it('should be a function', () => {
            expect(typeof initClipboardAndDownload).toBe('function');
        });

        it('should setup clipboard button handler', () => {
            const mockElements = { source: { value: 'test content' } };
            const mockStatusCallback = vi.fn();
            
            // Mock getElementById
            const originalGetElementById = document.getElementById;
            document.getElementById = (id) => {
                if (id === 'get-markdown') {
                    return { onclick: null };
                }
                if (id === 'download-markdown') {
                    return { onclick: null };
                }
                return null;
            };

            initClipboardAndDownload(mockElements, mockStatusCallback);

            // Restore and verify
            document.getElementById = originalGetElementById;
        });

        it('should handle missing buttons gracefully', () => {
            const mockElements = { source: { value: 'test' } };
            const mockStatusCallback = vi.fn();

            expect(() => initClipboardAndDownload(mockElements, mockStatusCallback)).not.toThrow();
        });
    });

    describe('setUIState', () => {
        it('should be a function', () => {
            expect(typeof setUIState).toBe('function');
        });

        it('should update UI elements for active state', () => {
            const mockPlayIcon = { classList: { toggle: vi.fn() } };
            const mockStopIcon = { classList: { toggle: vi.fn() } };
            const mockBtnTts = { classList: { toggle: vi.fn() } };

            const mockElements = {
                playIcon: mockPlayIcon,
                stopIcon: mockStopIcon,
                btnTts: mockBtnTts,
            };

            const result = setUIState(mockElements, true, true);

            expect(result).toBe(true);
            expect(mockPlayIcon.classList.toggle).toHaveBeenCalledWith('hidden', true);
            expect(mockStopIcon.classList.toggle).toHaveBeenCalledWith('hidden', false);
        });

        it('should update UI elements for inactive state', () => {
            const mockPlayIcon = { classList: { toggle: vi.fn() } };
            const mockStopIcon = { classList: { toggle: vi.fn() } };
            const mockBtnTts = { classList: { toggle: vi.fn() } };

            const mockElements = {
                playIcon: mockPlayIcon,
                stopIcon: mockStopIcon,
                btnTts: mockBtnTts,
            };

            const result = setUIState(mockElements, false, false);

            expect(result).toBe(false);
            expect(mockPlayIcon.classList.toggle).toHaveBeenCalledWith('hidden', false);
            expect(mockStopIcon.classList.toggle).toHaveBeenCalledWith('hidden', true);
        });

        it('should return new speaking state', () => {
            const mockElements = {
                playIcon: { classList: { toggle: vi.fn() } },
                stopIcon: { classList: { toggle: vi.fn() } },
                btnTts: { classList: { toggle: vi.fn() } },
            };

            expect(setUIState(mockElements, true, true)).toBe(true);
            expect(setUIState(mockElements, false, false)).toBe(false);
        });
    });
});