/**
 * UIManager handles theme toggling, modal management, and UI state updates
 * Now backed by AppStore reactive state.
 */

import { AppStore, ThemeEnum } from './app-store';

/**
 * Initialize theme toggle functionality
 */
export function initThemeToggle(themeToggle: HTMLElement | null): void {
    if (themeToggle) {
        themeToggle.onclick = () => {
            const currentTheme = AppStore.instance.theme.get();
            const isDark = currentTheme === ThemeEnum.Dark;
            const newTheme = isDark ? ThemeEnum.Light : ThemeEnum.Dark;
            AppStore.instance.theme.set(newTheme);
            document.documentElement.classList.toggle('dark', newTheme === ThemeEnum.Dark);
            AppStore.instance.saveToLocalStorage();
        };
    }
}

/**
 * Update playback controls based on speaking state
 */
export function updatePlaybackControls(elements: Record<string, HTMLElement>, active: boolean): void {
    const playIcon = (elements as any).playIcon as HTMLElement;
    const stopIcon = (elements as any).stopIcon as HTMLElement;
    const btnTts = (elements as any).btnTts as HTMLElement;

    if (playIcon) playIcon.classList.toggle('hidden', active);
    if (stopIcon) stopIcon.classList.toggle('hidden', !active);
    if (btnTts) btnTts.classList.toggle('text-red-600', active);
    if (btnTts) btnTts.classList.toggle('text-blue-600', !active);
}

/**
 * Reset status message after a delay
 */
export function resetStatusAfterDelay(statusCallback: (msg: string) => void, delay = 2000, readyMessage = 'Ready.'): void {
    if (typeof statusCallback === 'function') {
        setTimeout(() => statusCallback(readyMessage), delay);
    }
}

/**
 * Initialize help modal functionality
 */
export function initHelpModal(elements: Record<string, HTMLElement>): void {
    const helpModal = (elements as any).helpModal as HTMLElement;
    const helpToggle = (elements as any).helpToggle as HTMLElement;
    const helpCloseBtn = (elements as any).helpCloseBtn as HTMLElement;
    const helpCloseFooter = (elements as any).helpCloseFooter as HTMLElement;

    if (!helpModal || !helpToggle) return;

    const toggleHelp = (show: boolean) => helpModal.classList.toggle('hidden', !show);

    helpToggle.onclick = () => toggleHelp(true);
    if (helpCloseBtn) helpCloseBtn.onclick = () => toggleHelp(false);
    if (helpCloseFooter) helpCloseFooter.onclick = () => toggleHelp(false);
    helpModal.onclick = (e: Event) => {
        if (e.target === helpModal) toggleHelp(false);
    };
}

/**
 * Initialize clipboard and download functionality
 */
export function initClipboardAndDownload(elements: Record<string, HTMLElement>, statusCallback: (msg: string) => void): void {
    const getMarkdownBtn = document.getElementById('get-markdown');
    const downloadMarkdownBtn = document.getElementById('download-markdown');
    const sourceEl = (elements as any).source as HTMLTextAreaElement;

    if (getMarkdownBtn && sourceEl) {
        getMarkdownBtn.onclick = () => {
            navigator.clipboard.writeText(sourceEl.value);
            statusCallback('Copied!');
            setTimeout(() => statusCallback('Ready.'), 2000);
        };
    }

    if (downloadMarkdownBtn && sourceEl) {
        downloadMarkdownBtn.onclick = () => {
            const blob = new Blob([sourceEl.value], { type: 'text/markdown' });
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
 */
export function setUIState(elements: Record<string, HTMLElement>, active: boolean, _isSpeaking?: boolean): boolean {
    updatePlaybackControls(elements, active);
    return active;
}

/**
 * Initialize link interceptor for Visual mode
 */
export function initLinkInterceptor(visualElement: HTMLElement, isSourceMode: { current: boolean }): (() => void) {
    const handler = (e: MouseEvent) => {
        const link = (e.target as HTMLElement).closest('a');
        if (link && !isSourceMode.current) {
            e.preventDefault();
            window.open(link.href, '_blank');
        }
    };

    visualElement.addEventListener('click', handler);

    return () => visualElement.removeEventListener('click', handler);
}
