import { Editor, rootCtx, defaultValueCtx } from 'https://esm.sh/@milkdown/core';
import { nord } from 'https://esm.sh/@milkdown/theme-nord';
import { commonmark } from 'https://esm.sh/@milkdown/preset-commonmark';
import { gfm } from 'https://esm.sh/@milkdown/preset-gfm';
import { history } from 'https://esm.sh/@milkdown/plugin-history';
import { listener, listenerCtx } from 'https://esm.sh/@milkdown/plugin-listener';
import { replaceAll } from 'https://esm.sh/@milkdown/utils';

// --- STATE MANAGEMENT ---
const initialValue = `# Welcome to FreeTTS\n\nPlace your cursor anywhere and press [this link](https://google.com) to test.`;
let currentMarkdown = initialValue;
let milkdownEditor = null;
let isSourceMode = true; 
let isSpeaking = false;
let speechOffsetStart = 0;

// --- DOM REFERENCES ---
const elements = {
    source: document.getElementById('source-editor'),
    visual: document.getElementById('app'),
    container: document.getElementById('editor-container'),
    btnSource: document.getElementById('view-source'),
    btnVisual: document.getElementById('view-visual'),
    btnTts: document.getElementById('tts-toggle'),
    voiceSelect: document.getElementById('voice-select'),
    status: document.getElementById('status-msg'),
    playIcon: document.getElementById('play-icon'),
    stopIcon: document.getElementById('stop-icon'),
    helpToggle: document.getElementById('help-toggle'),
    helpModal: document.getElementById('help-modal'),
    helpCloseBtn: document.getElementById('help-close-btn'),
    helpCloseFooter: document.getElementById('help-close-footer'),
    themeToggle: document.getElementById('theme-toggle')
};

// Initialize source value
elements.source.value = initialValue;

// --- THEME MANAGEMENT ---
if (elements.themeToggle) {
    elements.themeToggle.onclick = () => {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.theme = isDark ? 'dark' : 'light';
    };
}

// --- LINK INTERCEPTOR ---
elements.visual.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link && !isSourceMode) {
        e.preventDefault();
        window.open(link.href, '_blank');
    }
});

// --- MILKDOWN INITIALIZATION ---
async function createEditor() {
    milkdownEditor = await Editor.make()
        .config((ctx) => {
            ctx.set(rootCtx, elements.visual);
            ctx.set(defaultValueCtx, currentMarkdown);
            ctx.get(listenerCtx).markdownUpdated((ctx, markdown) => {
                currentMarkdown = markdown;
                elements.source.value = markdown;
            });
        })
        .use(nord)
        .use(commonmark)
        .use(gfm)
        .use(history)
        .use(listener)
        .create();
}

// --- TAB SWITCHING ---
async function switchToVisual() {
    if (!isSourceMode) return;
    isSourceMode = false;
    currentMarkdown = elements.source.value;
    
    elements.container.classList.remove('source-mode');
    elements.btnSource.classList.remove('active-tab');
    elements.btnVisual.classList.add('active-tab');
    
    if (!milkdownEditor) {
        await createEditor();
    } else {
        milkdownEditor.action(replaceAll(currentMarkdown));
    }
}

function switchToSource() {
    if (isSourceMode) return;
    isSourceMode = true;
    elements.container.classList.add('source-mode');
    elements.btnVisual.classList.remove('active-tab');
    elements.btnSource.classList.add('active-tab');
    elements.source.value = currentMarkdown;
}

elements.btnVisual.onclick = switchToVisual;
elements.btnSource.onclick = switchToSource;

// --- MODAL LOGIC ---
const toggleHelp = (show) => {
    if (show) {
        elements.helpModal.classList.remove('hidden');
    } else {
        elements.helpModal.classList.add('hidden');
    }
};

elements.helpToggle.onclick = () => toggleHelp(true);
if (elements.helpCloseBtn) elements.helpCloseBtn.onclick = () => toggleHelp(false);
if (elements.helpCloseFooter) elements.helpCloseFooter.onclick = () => toggleHelp(false);

elements.helpModal.onclick = (e) => {
    if (e.target === elements.helpModal) toggleHelp(false);
};

// --- TTS LOGIC ---
const synth = window.speechSynthesis;
let voices = [];

function loadVoices() {
    voices = synth.getVoices();
    elements.voiceSelect.innerHTML = voices
        .map((v, i) => `<option value="${i}">${v.name} (${v.lang})</option>`)
        .join('');
}
if (synth.onvoiceschanged !== undefined) synth.onvoiceschanged = loadVoices;
loadVoices();

/**
 * Visual Highlighting Logic
 */
function highlightVisualWord(startOffset, wordLength) {
    const selection = window.getSelection();
    const range = document.createRange();
    
    let charCount = 0;
    let startNode = null;
    let startCharIndex = 0;
    let endNode = null;
    let endCharIndex = 0;

    const walker = document.createTreeWalker(elements.visual, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while (node = walker.nextNode()) {
        const nextCharCount = charCount + node.textContent.length;
        
        if (!startNode && startOffset >= charCount && startOffset < nextCharCount) {
            startNode = node;
            startCharIndex = startOffset - charCount;
        }
        
        if (startNode && (startOffset + wordLength) <= nextCharCount) {
            endNode = node;
            endCharIndex = (startOffset + wordLength) - charCount;
            break;
        }
        charCount = nextCharCount;
    }

    if (startNode && endNode) {
        range.setStart(startNode, startCharIndex);
        range.setEnd(endNode, endCharIndex);
        selection.removeAllRanges();
        selection.addRange(range);
    }
}

function getVisualCursorInfo() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return { text: elements.visual.innerText, offset: 0 };

    const range = selection.getRangeAt(0);
    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(elements.visual);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    
    const offset = preSelectionRange.toString().length;
    return { text: elements.visual.innerText, offset };
}

function togglePlayback() {
    if (isSpeaking) {
        synth.cancel();
        setUIState(false);
        return;
    }
    
    const activeSelection = window.getSelection();
    const selectionText = activeSelection.toString().trim();

    let textToSpeak = "";
    let startOffset = 0;

    if (selectionText) {
        textToSpeak = selectionText;
        if (isSourceMode) {
            startOffset = elements.source.selectionStart || 0;
        } else {
            const info = getVisualCursorInfo();
            startOffset = info.offset;
        }
        speechOffsetStart = startOffset; 
    } else if (isSourceMode) {
        startOffset = elements.source.selectionStart || 0;
        textToSpeak = elements.source.value.substring(startOffset);
        speechOffsetStart = startOffset;
    } else {
        const info = getVisualCursorInfo();
        startOffset = info.offset;
        textToSpeak = info.text.substring(startOffset);
        speechOffsetStart = startOffset;
    }

    if (!textToSpeak.trim()) {
        elements.status.textContent = "Please place cursor or select text.";
        setTimeout(() => elements.status.textContent = "Ready.", 2000);
        return;
    }

    const cleanContent = textToSpeak
        .replace(/[#*_~`]/g, '')
        .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        .replace(/\|/g, ' ');

    const utter = new SpeechSynthesisUtterance(cleanContent);
    const selectedVoice = voices[elements.voiceSelect.value];
    if (selectedVoice) utter.voice = selectedVoice;

    utter.onboundary = (e) => {
        if (e.name === 'word') {
            const wordMatch = e.utterance.text.substring(e.charIndex).match(/\w+/);
            const wordLen = wordMatch ? wordMatch[0].length : 0;
            
            if (isSourceMode) {
                elements.source.focus();
                elements.source.setSelectionRange(
                    speechOffsetStart + e.charIndex, 
                    speechOffsetStart + e.charIndex + wordLen
                );
            } else {
                highlightVisualWord(speechOffsetStart + e.charIndex, wordLen);
            }
        }
    };

    utter.onstart = () => setUIState(true);
    utter.onend = () => {
        setUIState(false);
        if (!isSourceMode) window.getSelection().removeAllRanges();
    };
    utter.onerror = () => setUIState(false);
    
    synth.speak(utter);
}

function setUIState(active) {
    isSpeaking = active;
    elements.playIcon.classList.toggle('hidden', active);
    elements.stopIcon.classList.toggle('hidden', !active);
    elements.btnTts.classList.toggle('text-red-600', active);
    elements.btnTts.classList.toggle('text-blue-600', !active);
}

elements.btnTts.onclick = togglePlayback;

// --- CLIPBOARD & DOWNLOAD ---
document.getElementById('get-markdown').onclick = () => {
    navigator.clipboard.writeText(elements.source.value);
    elements.status.textContent = "Copied!";
    setTimeout(() => elements.status.textContent = "Ready.", 2000);
};

document.getElementById('download-markdown').onclick = () => {
    const blob = new Blob([elements.source.value], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.md';
    a.click();
    URL.revokeObjectURL(url);
};