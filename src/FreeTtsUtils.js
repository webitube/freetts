import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core';
import { nord } from '@milkdown/theme-nord';
import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';
import { history } from '@milkdown/plugin-history';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { replaceAll } from '@milkdown/utils';
import { KokoroPlayer } from './kokoro-player.js';

// Wait for DOM to be fully loaded before accessing elements
document.addEventListener('DOMContentLoaded', () => {

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

// Kokoro TTS — managed by KokoroPlayer instance (created inside DOMContentLoaded)
// kokoroPlayer is created below after DOM is ready

// --- BROWSER DETECTION ---
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const isFirefox = /firefox/i.test(navigator.userAgent);
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);

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

// --- RESET BUTTON ---
if (elements.resetSettings) {
    elements.resetSettings.onclick = resetTTSSettings;
}

// --- SLIDER DISPLAY ---
elements.speedSlider.oninput = () => {
    elements.speedVal.textContent = `${parseFloat(elements.speedSlider.value).toFixed(1)}×`;
    saveTTSSettings();
};
elements.pitchSlider.oninput = () => {
    const v = parseInt(elements.pitchSlider.value);
    elements.pitchVal.textContent = v > 0 ? `+${v}` : `${v}`;
    saveTTSSettings();
};

// --- PITCH CONTROL ---
// Pitch is now available on all platforms and engines
function updatePitchWarning() {
    const slider = elements.pitchSlider;
    slider.disabled = false;
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
    saveTTSSettings();
    if (activeEngine === 'kokoro') {
        // Mobile Kokoro UX: Show info message and disable Kokoro on mobile
        if (isMobile) {
            elements.engineSelect.innerHTML = `
                <option value="webspeech" selected>Web Speech</option>
                <option value="kokoro" disabled>Kokoro TTS (unavailable on mobile)</option>
            `;
            // Add info indicator next to engine select
            let kokoroInfo = document.getElementById('kokoro-mobile-info');
            if (!kokoroInfo) {
                kokoroInfo = document.createElement('span');
                kokoroInfo.id = 'kokoro-mobile-info';
                kokoroInfo.className = 'kokoro-mobile-info';
                kokoroInfo.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                    <span>Kokoro disabled on mobile</span>
                `;
                elements.engineSelect.parentNode.insertBefore(kokoroInfo, elements.engineSelect.nextSibling);
            }
            kokoroInfo.classList.remove('hidden');
            loadWebSpeechVoices();
            updatePitchWarning();
            return;
        }

        //console.log(`onchange(): navigator.gpu=${navigator.gpu}, navigator.useWebGPU=${navigator.useWebGPU}`);

        kokoroPlayer._ensureWorker().then(() => {
            if (kokoroPlayer.voices) {
                loadKokoroVoices(kokoroPlayer.voices);
            } else {
                // Fallback: show placeholder
                elements.voiceSelect.innerHTML = '<option value="af_heart">Kokoro TTS (loading...)</option>';
            }
        });
    } else {
        // Remove info indicator when switching away from Kokoro
        const kokoroInfo = document.getElementById('kokoro-mobile-info');
        if (kokoroInfo) kokoroInfo.remove();
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

// --- LOCALSTORAGE PERSISTENCE ---
const STORAGE_KEY = 'freetts-settings';

function saveTTSSettings() {
    const settings = {
        engine: elements.engineSelect.value,
        voice: elements.voiceSelect.value,
        speed: elements.speedSlider.value,
        pitch: elements.pitchSlider.value,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function loadTTSSettings() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const settings = JSON.parse(saved);
            // Restore engine
            elements.engineSelect.value = settings.engine || 'webspeech';
            // Restore voice (only if Web Speech is selected)
            if (settings.engine === 'webspeech' && settings.voice) {
                elements.voiceSelect.value = settings.voice;
            }
            // Restore speed
            elements.speedSlider.value = settings.speed || 1;
            elements.speedVal.textContent = `${parseFloat(elements.speedSlider.value).toFixed(1)}×`;
            // Restore pitch
            elements.pitchSlider.value = settings.pitch || 0;
            const pitchVal = parseInt(elements.pitchSlider.value);
            elements.pitchVal.textContent = pitchVal > 0 ? `+${pitchVal}` : `${pitchVal}`;
        }
    } catch (e) {
        console.error('Failed to load TTS settings:', e);
    }
}

function resetTTSSettings() {
    // Reset all controls to defaults
    elements.engineSelect.value = 'webspeech';
    elements.voiceSelect.value = '';
    elements.speedSlider.value = 1;
    elements.speedVal.textContent = '1×';
    elements.pitchSlider.value = 0;
    elements.pitchVal.textContent = '0';
    // Reload saved settings (keeps user preferences)
    loadTTSSettings();
    elements.status.textContent = 'Settings reset.';
    setTimeout(() => elements.status.textContent = 'Ready.', 2000);
}

// --- MAIN PLAYBACK TOGGLE ---
function togglePlayback() {
    // Load persisted settings before playing
    loadTTSSettings();
    
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

// --- MAIN PLAYBACK TOGGLE (duplicate removed) ---
function setUIState(active) {
    isSpeaking = active;
    elements.playIcon.classList.toggle('hidden', active);
    elements.stopIcon.classList.toggle('hidden', !active);
    elements.btnTts.classList.toggle('text-red-600', active);
    elements.btnTts.classList.toggle('text-blue-600', !active);
}

elements.btnTts.onclick = togglePlayback;

// --- KEYBOARD SHORTCUT: Ctrl+Enter to toggle playback ---
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        togglePlayback();
    }
});

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

// --- KOKORO TTS PLAYER ---
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
}); // Close DOMContentLoaded
