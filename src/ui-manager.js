/**
 * UIManager handles theme toggling, modal management, and UI state updates
 */

/**
 * Initialize theme toggle functionality
 * @param {HTMLElement} themeToggle - Theme toggle button element
 */
export function initThemeToggle(themeToggle) {
    if (themeToggle) {
        themeToggle.onclick = () => {
            const isDark = document.documentElement.classList.toggle('dark');
            localStorage.theme = isDark ? 'dark' : 'light';
        };
    }
}

export function updatePlaybackControls(elements, active) {
    elements.playIcon.classList.toggle('hidden', active);
    elements.stopIcon.classList.toggle('hidden', !active);
    elements.btnTts.classList.toggle('text-red-600', active);
    elements.btnTts.classList.toggle('text-blue-600', !active);
}

export function resetStatusAfterDelay(statusCallback, delay = 2000, readyMessage = 'Ready.') {
    if (typeof statusCallback === 'function') {
        setTimeout(() => statusCallback(readyMessage), delay);
    }
}

/**
 * Initialize help modal functionality
 * @param {Object} elements - DOM elements object
 */
export function initHelpModal(elements) {
    const toggleHelp = (show) => elements.helpModal.classList.toggle('hidden', !show);
    elements.helpToggle.onclick = () => toggleHelp(true);
    if (elements.helpCloseBtn) elements.helpCloseBtn.onclick = () => toggleHelp(false);
    if (elements.helpCloseFooter) elements.helpCloseFooter.onclick = () => toggleHelp(false);
    elements.helpModal.onclick = (e) => { if (e.target === elements.helpModal) toggleHelp(false); };
}

/**
 * Initialize clipboard and download functionality
 * @param {Object} elements - DOM elements object
 * @param {Function} statusCallback - Callback to update status message
 */
export function initClipboardAndDownload(elements, statusCallback) {
    const getMarkdownBtn = document.getElementById('get-markdown');
    const downloadMarkdownBtn = document.getElementById('download-markdown');
    
    if (getMarkdownBtn) {
        getMarkdownBtn.onclick = () => {
            navigator.clipboard.writeText(elements.source.value);
            statusCallback('Copied!');
            setTimeout(() => statusCallback('Ready.'), 2000);
        };
    }
    
    if (downloadMarkdownBtn) {
        downloadMarkdownBtn.onclick = () => {
            const blob = new Blob([elements.source.value], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'document.md';
            a.click();
            URL.revokeObjectURL(url);
        };
    }
}

/**
 * Update UI state for playback
 * @param {Object} elements - DOM elements object
 * @param {boolean} active - Whether playback is active
 * @param {boolean} isSpeaking - Current speaking state
 * @returns {boolean} Updated speaking state
 */
export function setUIState(elements, active, isSpeaking) {
    updatePlaybackControls(elements, active);
    return active;
}

/**
 * Initialize link interceptor for Visual mode
 * @param {HTMLElement} visualElement - Visual mode container
 * @param {boolean} isSourceMode - Whether currently in source mode
 * @returns {Function} Cleanup function
 */
export function initLinkInterceptor(visualElement, isSourceMode) {
    const handler = (e) => {
        const link = e.target.closest('a');
        if (link && !isSourceMode.current) {
            e.preventDefault();
            window.open(link.href, '_blank');
        }
    };
    
    visualElement.addEventListener('click', handler);
    
    // Return cleanup function
    return () => visualElement.removeEventListener('click', handler);
}
