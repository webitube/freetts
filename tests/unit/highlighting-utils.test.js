import { describe, it, expect, beforeEach } from 'vitest';
import { cleanMarkdown, highlightVisualWord, getVisualCursorInfo } from '../../src/highlighting-utils.js';

describe('highlighting-utils.js', () => {
    describe('cleanMarkdown', () => {
        it('should remove heading characters', () => {
            const input = '# Heading 1\n## Heading 2\n### Heading 3';
            const result = cleanMarkdown(input);
            expect(result).toBe(' Heading 1\n Heading 2\n Heading 3');
        });

        it('should remove bold markers', () => {
            const input = '**bold text**';
            const result = cleanMarkdown(input);
            expect(result).toBe('bold text');
        });

        it('should remove italic markers', () => {
            const input = '*italic text*';
            const result = cleanMarkdown(input);
            expect(result).toBe('italic text');
        });

        it('should remove strikethrough markers', () => {
            const input = '~~strikethrough~~';
            const result = cleanMarkdown(input);
            expect(result).toBe('strikethrough');
        });

        it('should remove inline code markers', () => {
            const input = '`code here`';
            const result = cleanMarkdown(input);
            expect(result).toBe('code here');
        });

        it('should remove link syntax and keep link text', () => {
            const input = '[Click here](https://example.com)';
            const result = cleanMarkdown(input);
            expect(result).toBe('Click here');
        });

        it('should remove multiple links', () => {
            const input = '[Link 1](url1) and [Link 2](url2)';
            const result = cleanMarkdown(input);
            expect(result).toBe('Link 1 and Link 2');
        });

        it('should replace pipe characters with spaces', () => {
            const input = 'col1|col2|col3';
            const result = cleanMarkdown(input);
            expect(result).toBe('col1 col2 col3');
        });

        it('should handle mixed markdown syntax', () => {
            const input = '# **Bold** `code` and ~~strike~~';
            const result = cleanMarkdown(input);
            expect(result).toBe(' Bold code and strike');
        });

        it('should return plain text unchanged', () => {
            const input = 'This is plain text without markdown';
            const result = cleanMarkdown(input);
            expect(result).toBe(input);
        });

        it('should handle empty string', () => {
            const result = cleanMarkdown('');
            expect(result).toBe('');
        });

        it('should handle null/undefined gracefully', () => {
            // These should throw or return empty - testing expected behavior
            expect(() => cleanMarkdown(null)).toThrow();
            expect(() => cleanMarkdown(undefined)).toThrow();
        });
    });

    describe('highlightVisualWord', () => {
        it('should be a function', () => {
            expect(typeof highlightVisualWord).toBe('function');
        });

        it('should highlight text in a visual element', () => {
            // Create a mock visual element
            const mockElement = document.createElement('div');
            mockElement.textContent = 'Hello World Test';
            document.body.appendChild(mockElement);

            // Mock window.getSelection
            const mockRange = {
                setStart: vi.fn(),
                setEnd: vi.fn(),
            };
            const mockSelection = {
                removeAllRanges: vi.fn(),
                addRange: vi.fn(),
            };
            global.document.createRange = () => mockRange;
            global.window.getSelection = () => mockSelection;

            // Call the function
            highlightVisualWord(0, 5, mockElement);

            // Verify the range was set
            expect(mockRange.setStart).toHaveBeenCalled();
            expect(mockRange.setEnd).toHaveBeenCalled();
            expect(mockSelection.addRange).toHaveBeenCalled();

            document.body.removeChild(mockElement);
        });
    });

    describe('getVisualCursorInfo', () => {
        it('should be a function', () => {
            expect(typeof getVisualCursorInfo).toBe('function');
        });

        it('should return text content and offset', () => {
            const mockElement = document.createElement('div');
            mockElement.textContent = 'Hello World';
            Object.defineProperty(mockElement, 'innerText', { value: 'Hello World' });
            document.body.appendChild(mockElement);

            // Mock no selection
            global.window.getSelection = () => ({
                rangeCount: 0,
            });

            const result = getVisualCursorInfo(mockElement);
            expect(result.text).toBe('Hello World');
            expect(result.offset).toBe(0);

            document.body.removeChild(mockElement);
        });

        it('should return offset when selection exists', () => {
            const mockElement = document.createElement('div');
            mockElement.textContent = 'Hello World';
            Object.defineProperty(mockElement, 'innerText', { value: 'Hello World' });
            document.body.appendChild(mockElement);

            // Mock selection with range
            const mockRange = {
                cloneRange: () => ({
                    selectNodeContents: () => {},
                    setEnd: () => {},
                    toString: () => 'Hello',
                }),
                startContainer: {},
                startOffset: 5,
            };
            global.window.getSelection = () => ({
                rangeCount: 1,
                getRangeAt: () => mockRange,
            });

            const result = getVisualCursorInfo(mockElement);
            expect(result.text).toBe('Hello World');
            expect(result.offset).toBe(5);

            document.body.removeChild(mockElement);
        });
    });
});