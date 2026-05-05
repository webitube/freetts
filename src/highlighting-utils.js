/**
 * Highlighting utilities for text selection and word-level highlighting
 * in both Source and Visual editing modes.
 */

/**
 * Highlight a word in Visual mode using TreeWalker
 * @param {number} startOffset - Character offset to start highlighting
 * @param {number} wordLength - Length of the word to highlight
 * @param {HTMLElement} visualElement - The Visual mode container element
 */
export function highlightVisualWord(startOffset, wordLength, visualElement) {
    const selection = window.getSelection();
    const range = document.createRange();
    let charCount = 0;
    let startNode = null;
    let startCharIndex = 0;
    let endNode = null;
    let endCharIndex = 0;
    
    const walker = document.createTreeWalker(visualElement, NodeFilter.SHOW_TEXT, null, false);
    let node;
    
    while ((node = walker.nextNode())) {
        const next = charCount + node.textContent.length;
        if (!startNode && startOffset >= charCount && startOffset < next) {
            startNode = node;
            startCharIndex = startOffset - charCount;
        }
        if (startNode && (startOffset + wordLength) <= next) {
            endNode = node;
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
 * @param {HTMLElement} visualElement - The Visual mode container element
 * @returns {{text: string, offset: number}} Text content and cursor offset
 */
export function getVisualCursorInfo(visualElement) {
    const selection = window.getSelection();
    if (!selection.rangeCount) {
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
 * @param {string} text - Text containing Markdown syntax
 * @returns {string} Cleaned text without Markdown syntax
 */
export function cleanMarkdown(text) {
    return text
        .replace(/[#*_~`]/g, '')
        .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        .replace(/\|/g, ' ');
}
