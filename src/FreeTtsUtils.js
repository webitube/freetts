import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core';
import { nord } from '@milkdown/theme-nord';
import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';
import { history } from '@milkdown/plugin-history';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { replaceAll } from '@milkdown/utils';
import { KokoroPlayer } from './kokoro-player.js';

// --- STATE ---
const initialValue = `# Welcome to FreeTTS`;
let currentMarkdown = initialValue;
let milkdownEditor = null;
let isSourceMode = true;
let isSpeaking = false;
let speechOffsetStart = 0;

// TTS engine state
let activeEngine = 'webspeech';

// WebSpeech
const synth = window.speechSynthesis;
let voices = [];

// Kokoro TTS — managed by KokoroPlayer instance
const kokoroPlayer = new KokoroPlayer('kokoro-chunk-list', (msg) => {
    if (elements.ttsStatus) elements.ttsStatus.textContent = msg;
    // Show download button when Kokoro TTS is active and has merged audio
    const dlBtn = document.getElementById('download-audio');
    if (dlBtn) {
        dlBtn.classList.toggle('hidden', activeEngine !== 'kokoro' || !kokoroPlayer.mergedBlob);
    }
}, (active) => {
    // Sync isSpeaking state with the UI play/stop button
    isSpeaking = active;
    elements.playIcon.classList.toggle('hidden', active);
    elements.stopIcon.classList.toggle('hidden', !active);
    elements.btnTts.classList.toggle('text-red-600', active);
    elements.btnTts.classList.toggle('text-blue-600', !active);
});

// --- BROWSER DETECTION ---
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const isFirefox = /firefox/i.test(navigator.userAgent);

// --- DOM ---
const elements = {
    source: document.getElementById('source-editor'),
    visual: document.getElementById('app'),
    container: document.getElementById('editor-container'),
    btnSource: document.getElementById('view-source'),
    btnVisual: document.getElementById('view-visual'),
    btnTts: document.getElementById('tts-toggle'),
    engineSelect: document.getElementById('engine-select'),
    voiceSelect: document.getElementById('voice-select'),
    speedSlider: document.getElementById('tts-speed'),
    speedVal: document.getElementById('speed-val'),
    pitchSlider: document.getElementById('tts-pitch'),
    pitchVal: document.getElementById('pitch-val'),
    pitchWarning: document.getElementById('pitch-warning'),
    status: document.getElementById('status-msg'),
    ttsStatus: document.getElementById('tts-status'),
    playIcon: document.getElementById('play-icon'),
    stopIcon: document.getElementById('stop-icon'),
    helpToggle: document.getElementById('help-toggle'),
    helpModal: document.getElementById('help-modal'),
    helpCloseBtn: document.getElementById('help-close-btn'),
    helpCloseFooter: document.getElementById('help-close-footer'),
    themeToggle: document.getElementById('theme-toggle'),
};

elements.source.value = initialValue;

// --- THEME ---
if (elements.themeToggle) {
    elements.themeToggle.onclick = () => {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.theme = isDark ? 'dark' : 'light';
    };
}

// --- LINK INTERCEPTOR ---
elements.visual.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link && !isSourceMode) { e.preventDefault(); window.open(link.href, '_blank'); }
});

// --- MILKDOWN ---
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
        .use(nord).use(commonmark).use(gfm).use(history).use(listener)
        .create();
}

async function switchToVisual() {
    if (!isSourceMode) return;
    isSourceMode = false;
    currentMarkdown = elements.source.value;
    elements.container.classList.remove('source-mode');
    elements.btnSource.classList.remove('active-tab');
    elements.btnVisual.classList.add('active-tab');
    if (!milkdownEditor) { await createEditor(); }
    else { milkdownEditor.action(replaceAll(currentMarkdown)); }
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

// --- MODAL ---
const toggleHelp = (show) => elements.helpModal.classList.toggle('hidden', !show);
elements.helpToggle.onclick = () => toggleHelp(true);
if (elements.helpCloseBtn) elements.helpCloseBtn.onclick = () => toggleHelp(false);
if (elements.helpCloseFooter) elements.helpCloseFooter.onclick = () => toggleHelp(false);
elements.helpModal.onclick = (e) => { if (e.target === elements.helpModal) toggleHelp(false); };

// --- SLIDER DISPLAY ---
elements.speedSlider.oninput = () => {
    elements.speedVal.textContent = `${parseFloat(elements.speedSlider.value).toFixed(1)}×`;
};
elements.pitchSlider.oninput = () => {
    const v = parseInt(elements.pitchSlider.value);
    elements.pitchVal.textContent = v > 0 ? `+${v}` : `${v}`;
};

// --- PITCH WARNING ---
function updatePitchWarning() {
    const el = elements.pitchWarning;
    const slider = elements.pitchSlider;
    if (activeEngine === 'kokoro') {
        el.textContent = 'Pitch only applies to Web Speech.';
        el.classList.remove('hidden');
        slider.disabled = false;
    } else if (isSafari) {
        el.textContent = 'Pitch not supported in Safari.';
        el.classList.remove('hidden');
        slider.disabled = true;
    } else if (isFirefox) {
        el.textContent = 'Pitch may not work in Firefox.';
        el.classList.remove('hidden');
        slider.disabled = false;
    } else {
        el.textContent = '';
        el.classList.add('hidden');
        slider.disabled = false;
    }
}
updatePitchWarning();

// --- WEBSPEECH VOICES ---
function loadWebSpeechVoices() {
    voices = synth.getVoices();
    elements.voiceSelect.innerHTML = voices
        .map((v, i) => `<option value="${i}">${v.name} (${v.lang})</option>`)
        .join('');
}
if (synth.onvoiceschanged !== undefined) synth.onvoiceschanged = loadWebSpeechVoices;
loadWebSpeechVoices();

// --- ENGINE SWITCH ---
elements.engineSelect.onchange = () => {
    activeEngine = elements.engineSelect.value;
    if (activeEngine === 'kokoro') {
        kokoroPlayer._ensureWorker().then(() => {
            if (kokoroPlayer.voices) {
                loadKokoroVoices(kokoroPlayer.voices);
            } else {
                // Fallback: show placeholder
                elements.voiceSelect.innerHTML = '<option value="af_heart">Kokoro TTS (loading...)</option>';
            }
        });
    } else {
        loadWebSpeechVoices();
    }
    updatePitchWarning();
};

function loadKokoroVoices(voices) {
    elements.voiceSelect.innerHTML = Object.entries(voices)
        .map(([key, v]) => {
            const locale = v.language === 'en-us' ? 'American' : 'British';
            return `<option value="${key}">${v.name} (${locale} ${v.gender})</option>`;
        })
        .join('');
}

// --- VISUAL HIGHLIGHTING (used by WebSpeech word tracking) ---
function highlightVisualWord(startOffset, wordLength) {
    const selection = window.getSelection();
    const range = document.createRange();
    let charCount = 0, startNode = null, startCharIndex = 0, endNode = null, endCharIndex = 0;
    const walker = document.createTreeWalker(elements.visual, NodeFilter.SHOW_TEXT, null, false);
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


function getVisualCursorInfo() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return { text: elements.visual.innerText, offset: 0 };
    const range = selection.getRangeAt(0);
    const pre = range.cloneRange();
    pre.selectNodeContents(elements.visual);
    pre.setEnd(range.startContainer, range.startOffset);
    return { text: elements.visual.innerText, offset: pre.toString().length };
}

// --- MARKDOWN CLEANER (for WebSpeech) ---
function cleanMarkdown(text) {
    return text
        .replace(/[#*_~`]/g, '')
        .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        .replace(/\|/g, ' ');
}

// --- WEBSPEECH PLAYBACK ---
function speakWithWebSpeech(textToSpeak, startOffset) {
    const cleanText = cleanMarkdown(textToSpeak);
    const utter = new SpeechSynthesisUtterance(cleanText);
    const selectedVoice = voices[elements.voiceSelect.value];
    if (selectedVoice) utter.voice = selectedVoice;
    utter.rate = parseFloat(elements.speedSlider.value);
    if (!isSafari) utter.pitch = 1 + parseInt(elements.pitchSlider.value) / 12;

    utter.onboundary = (e) => {
        if (e.name !== 'word') return;
        const wordMatch = e.utterance.text.substring(e.charIndex).match(/\w+/);
        const wordLen = wordMatch ? wordMatch[0].length : 0;
        if (isSourceMode) {
            elements.source.focus();
            elements.source.setSelectionRange(startOffset + e.charIndex, startOffset + e.charIndex + wordLen);
        } else {
            highlightVisualWord(startOffset + e.charIndex, wordLen);
        }
    };
    utter.onstart = () => setUIState(true);
    utter.onend = () => { setUIState(false); if (!isSourceMode) window.getSelection().removeAllRanges(); };
    utter.onerror = () => setUIState(false);
    speechOffsetStart = startOffset;
    synth.speak(utter);
}

function stopWebSpeech() {
    synth.cancel();
    setUIState(false);
}

// --- KOKORO TTS PLAYBACK ---
let kokoroTextToSpeak = '';
let kokoroStartOffset = 0;

function speakWithKokoro(textToSpeak, startOffset) {
    kokoroTextToSpeak = textToSpeak;
    kokoroStartOffset = startOffset;
    const voice = elements.voiceSelect.value || 'af_heart';
    const speed = parseFloat(elements.speedSlider.value);
    kokoroPlayer.play(textToSpeak, voice, speed);
}

function stopKokoro() {
    kokoroPlayer.stop();
}

// Chunk-by-chunk highlighting for Kokoro TTS
kokoroPlayer._onChunkPlay = (index) => {
    const chunk = kokoroPlayer.chunks[index];
    if (!chunk) return;

    // Find the chunk text position within the full text
    // Walk from the start of text, matching chunks sequentially
    let searchFrom = 0;
    for (let i = 0; i < index; i++) {
        const prevChunk = kokoroPlayer.chunks[i];
        if (prevChunk) {
            const pos = kokoroTextToSpeak.indexOf(prevChunk.text, searchFrom);
            if (pos >= 0) searchFrom = pos + prevChunk.text.length;
        }
    }

    const chunkPos = kokoroTextToSpeak.indexOf(chunk.text, searchFrom);
    if (chunkPos < 0) return;

    const offset = kokoroStartOffset + chunkPos;
    const length = chunk.text.length;

    if (isSourceMode) {
        elements.source.focus();
        elements.source.setSelectionRange(offset, offset + length);
    } else {
        highlightVisualWord(offset, length);
    }
};

// --- MAIN PLAYBACK TOGGLE ---
function togglePlayback() {
    if (isSpeaking) {
        if (activeEngine === 'kokoro') stopKokoro();
        else stopWebSpeech();
        return;
    }

    const selectionText = window.getSelection().toString().trim();
    let textToSpeak = '';
    let startOffset = 0;

    if (selectionText) {
        textToSpeak = selectionText;
        startOffset = isSourceMode ? (elements.source.selectionStart || 0) : getVisualCursorInfo().offset;
    } else if (isSourceMode) {
        startOffset = elements.source.selectionStart || 0;
        textToSpeak = elements.source.value.substring(startOffset);
    } else {
        const info = getVisualCursorInfo();
        startOffset = info.offset;
        textToSpeak = info.text.substring(startOffset);
    }

    if (!textToSpeak.trim()) {
        elements.status.textContent = 'Please place cursor or select text.';
        setTimeout(() => elements.status.textContent = 'Ready.', 2000);
        return;
    }

    if (activeEngine === 'kokoro') {
        speakWithKokoro(textToSpeak, startOffset);
    } else {
        speakWithWebSpeech(textToSpeak, startOffset);
    }
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
    elements.status.textContent = 'Copied!';
    setTimeout(() => elements.status.textContent = 'Ready.', 2000);
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

document.getElementById('download-audio').onclick = () => {
    kokoroPlayer.downloadMerged();
};
