/**
 * Highlighting utilities for text selection and word-level highlighting
 * in both Source and Visual editing modes.
 *
 * Used by TTSController to synchronize spoken words with the editor display.
 */

/**
 * Highlight a word in Visual mode using TreeWalker.
 * Traverses DOM text nodes to find the character range corresponding
 * to the given offset and length, then creates a selection range.
 *
 * @param startOffset - Character offset from the beginning of the text content
 * @param wordLength - Number of characters to highlight
 * @param visualElement - The root HTMLElement to search within
 */
export function highlightVisualWord(startOffset: number, wordLength: number, visualElement: HTMLElement): void {
    const selection = window.getSelection();
    if (!selection) return;

    const range = document.createRange();
    let charCount = 0;
    let startNode: Text | null = null;
    let startCharIndex = 0;
    let endNode: Text | null = null;
    let endCharIndex = 0;

    const walker = document.createTreeWalker(visualElement, NodeFilter.SHOW_TEXT, null, false);
    let node: Node | null;

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

    if (startNode && endNode) {
        range.setStart(startNode, startCharIndex);
        range.setEnd(endNode, endCharIndex);
        selection.removeAllRanges();
        selection.addRange(range);
    }
}

/**
 * Get cursor information from Visual mode
 */
export function getVisualCursorInfo(visualElement: HTMLElement): { text: string; offset: number } {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) {
        return { text: visualElement.innerText, offset: 0 };
    }

    const range = selection.getRangeAt(0);
    const pre = range.cloneRange();
    pre.selectNodeContents(visualElement);
    pre.setEnd(range.startContainer, range.startOffset);

    return { text: visualElement.innerText, offset: pre.toString().length };
}

/**
 * Clean Markdown syntax from text for TTS playback
 */
export function cleanMarkdown(text: string): string {
    return text
        .replace(/[#*_~`]/g, '')
        .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        .replace(/\|/g, ' ');
}
