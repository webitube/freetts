import { Editor, rootCtx, defaultValueCtx } from 'https://esm.sh/@milkdown/core';
import { nord } from 'https://esm.sh/@milkdown/theme-nord';
import { commonmark } from 'https://esm.sh/@milkdown/preset-commonmark';
import { gfm } from 'https://esm.sh/@milkdown/preset-gfm';
import { history } from 'https://esm.sh/@milkdown/plugin-history';
import { listener, listenerCtx } from 'https://esm.sh/@milkdown/plugin-listener';
import { replaceAll } from 'https://esm.sh/@milkdown/utils';

// --- STATE MANAGEMENT ---
const initialValue = `# Welcome to FreeTTS\n\nPlace your cursor anywhere and press play.`;
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
    stopIcon: document.getElementById('stop-icon')
};

// --- THEME & MODAL LOGIC ---
document.getElementById('theme-toggle').onclick = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.theme = isDark ? 'dark' : 'light';
};

const toggleHelp = () => document.getElementById('help-modal').classList.toggle('hidden');
document.getElementById('help-toggle').onclick = toggleHelp;
document.getElementById('help-close-btn').onclick = toggleHelp;

// --- SPEECH ENGINE ---
const synth = window.speechSynthesis;
let voices = [];

function initVoices() {
    voices = synth.getVoices();
    if (!voices.length) return;
    elements.voiceSelect.innerHTML = voices.map((v, i) => 
        `<option value="${i}">${v.name} (${v.lang})</option>`).join('');
    elements.status.textContent = "Engine Ready.";
}
if (synth.onvoiceschanged !== undefined) synth.onvoiceschanged = initVoices;
initVoices();

// --- UTILS ---
const findWordStart = (text, idx) => {
    let s = idx;
    while (s > 0 && /\w/.test(text[s - 1])) s--;
    return s;
};

const cleanMD = (text) => {
    return text.replace(/[#*_~`|>\[\]\(\)]/g, ' ');
};

// --- EDITOR INITIALIZATION ---
async function initEditor() {
    milkdownEditor = await Editor.make()
        .config((ctx) => {
            ctx.set(rootCtx, '#app');
            ctx.set(defaultValueCtx, initialValue);
            ctx.get(listenerCtx).markdownUpdated((_, md) => {
                currentMarkdown = md;
                if (!isSourceMode) elements.source.value = md;
            });
        })
        .use(nord).use(commonmark).use(gfm).use(history).use(listener)
        .create();
    elements.source.value = initialValue;
}
window.onload = initEditor;

// --- VIEW CONTROLS ---
elements.btnVisual.onclick = () => {
    if (!isSourceMode) return;
    isSourceMode = false;
    milkdownEditor.action(replaceAll(elements.source.value));
    elements.container.classList.remove('source-mode');
    elements.btnVisual.classList.add('bg-white', 'dark:bg-slate-700', 'active-tab');
    elements.btnSource.classList.remove('bg-white', 'dark:bg-slate-700', 'active-tab');
};

elements.btnSource.onclick = () => {
    if (isSourceMode) return;
    isSourceMode = true;
    elements.container.classList.add('source-mode');
    elements.btnSource.classList.add('bg-white', 'dark:bg-slate-700', 'active-tab');
    elements.btnVisual.classList.remove('bg-white', 'dark:bg-slate-700', 'active-tab');
    elements.source.focus();
};

// --- TTS PLAYBACK LOGIC ---
function togglePlayback() {
    if (isSpeaking) {
        synth.cancel();
        setUIState(false);
        return;
    }

    let text = "";
    let start = elements.source.selectionStart;
    const end = elements.source.selectionEnd;

    // REFACTOR: Handle Word Boundary Playback
    if (isSourceMode) {
        if (start === end) {
            start = findWordStart(elements.source.value, start);
            elements.source.setSelectionRange(start, start);
        }
        speechOffsetStart = start;
        text = cleanMD(elements.source.value.substring(start, end || elements.source.value.length));
    } else {
        text = cleanMD(currentMarkdown);
    }

    if (!text.trim()) return;

    const utter = new SpeechSynthesisUtterance(text);
    utter.voice = voices[elements.voiceSelect.value];
    
    utter.onboundary = (e) => {
        if (e.name === 'word' && isSourceMode) {
            const word = e.utterance.text.substring(e.charIndex).match(/\w+/);
            if (word) {
                elements.source.focus();
                elements.source.setSelectionRange(
                    speechOffsetStart + e.charIndex, 
                    speechOffsetStart + e.charIndex + word[0].length
                );
            }
        }
    };

    utter.onstart = () => setUIState(true);
    utter.onend = () => setUIState(false);
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