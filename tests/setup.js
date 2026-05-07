import { vi } from 'vitest';

// Create a proper localStorage mock with internal storage
const store = new Map();

const localStorageMock = new Proxy({
    getItem(key) {
        return store.get(key) !== undefined ? store.get(key) : null;
    },
    setItem(key, value) {
        store.set(key, value);
    },
    removeItem(key) {
        store.delete(key);
    },
    clear() {
        store.clear();
    },
}, {
    get(target, prop) {
        if (prop === 'getItem' || prop === 'setItem' || prop === 'removeItem' || prop === 'clear') {
            return target[prop];
        }
        // Support property access like localStorage.theme
        return store.get(prop) !== undefined ? store.get(prop) : null;
    },
    set(target, prop, value) {
        // Support property assignment like localStorage.theme = 'dark'
        store.set(prop, value);
        return true;
    },
});

// Override localStorage before any tests run
Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
});

// Also set it on window if it exists
if (global.window) {
    Object.defineProperty(global.window, 'localStorage', {
        value: localStorageMock,
        writable: true,
        configurable: true,
    });
}

// Mock Web Speech API
const mockSpeechSynthesis = {
    getVoices: () => [],
    speak: () => {},
    cancel: () => {},
    pause: () => {},
    resume: () => {},
    onvoiceschanged: null,
};

Object.defineProperty(global, 'speechSynthesis', {
    value: mockSpeechSynthesis,
    writable: true,
    configurable: true,
});

// Mock SpeechSynthesisUtterance
class MockSpeechSynthesisUtterance {
    constructor(text = '') {
        this.text = text;
        this.voice = null;
        this.lang = 'en-US';
        this.rate = 1;
        this.pitch = 1;
        this.volume = 1;
        this.onstart = null;
        this.onend = null;
        this.onerror = null;
        this.onboundary = null;
    }
}

global.SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;

// Mock Kokoro TTS
global.kokoro = {
    load: vi.fn().mockResolvedValue({
        infer: vi.fn().mockResolvedValue({
            audio: new Float32Array([0, 0, 0]),
        }),
    }),
};

// Mock DOMDocument
const mockDomElements = new Map();
let mockDomId = 0;

global.document = {
    createElement: vi.fn((tag) => {
        const id = ++mockDomId;
        const element = {
            __id: id,
            tagName: tag.toUpperCase(),
            classList: { add: vi.fn(), remove: vi.fn(), toggle: vi.fn() },
            textContent: '',
            innerText: '',
            href: '',
            download: '',
            children: [],
            appendChild: vi.fn((child) => {
                element.children.push(child);
                return child;
            }),
            removeChild: vi.fn((child) => {
                element.children = element.children.filter(c => c !== child);
                return child;
            }),
            getElementsByTagName: vi.fn(() => []),
            querySelector: vi.fn(() => null),
            querySelectorAll: vi.fn(() => []),
            setAttribute: vi.fn(),
            getAttribute: vi.fn(),
            style: {},
        };
        mockDomElements.set(id, element);
        return element;
    }),
    createTreeWalker: vi.fn((root) => ({
        root: root,
        currentNode: root,
        nextNode: vi.fn(() => root ? { textContent: root.textContent || '' } : null),
        previousNode: vi.fn(() => null),
    })),
    createRange: vi.fn(() => ({
        setStart: vi.fn(),
        setEnd: vi.fn(),
        selectNodeContents: vi.fn(),
        cloneRange: vi.fn(() => ({
            selectNodeContents: vi.fn(),
            setEnd: vi.fn(),
            toString: vi.fn(() => ''),
        })),
    })),
   documentElement: {
        classList: {
            __dark: false,
            has: vi.fn((cls) => cls === 'dark'),
            add: vi.fn((cls) => { if (cls === 'dark') document.documentElement.classList.__dark = true; }),
            remove: vi.fn((cls) => { if (cls === 'dark') document.documentElement.classList.__dark = false; }),
            toggle: vi.fn((cls) => {
                if (cls === 'dark') {
                    document.documentElement.classList.__dark = !document.documentElement.classList.__dark;
                    return document.documentElement.classList.__dark;
                }
                return false;
            }),
            contains: vi.fn((cls) => {
                if (cls === 'dark') return document.documentElement.classList.__dark;
                return false;
            }),
        },
    },
    body: {
        classList: { add: vi.fn(), remove: vi.fn(), toggle: vi.fn() },
        textContent: '',
        appendChild: vi.fn((child) => child),
        removeChild: vi.fn((child) => child),
        getElementsByTagName: vi.fn(() => []),
        querySelector: vi.fn(() => null),
        querySelectorAll: vi.fn(() => []),
        style: {},
    },
    getElementById: vi.fn((id) => {
        // Return mock elements for common IDs
        const mockElements = {
            themeToggle: { onclick: null, classList: { toggle: vi.fn() } },
            helpToggle: { onclick: null },
            helpModal: { classList: { toggle: vi.fn() }, onclick: null },
            helpCloseBtn: { onclick: null },
            helpCloseFooter: { onclick: null },
            clipboardBtn: { onclick: null },
            downloadBtn: { onclick: null },
            playIcon: { classList: { toggle: vi.fn() } },
            stopIcon: { classList: { toggle: vi.fn() } },
            btnTts: { classList: { toggle: vi.fn() } },
        };
        return mockElements[id] || null;
    }),
};

// Mock window.getSelection
global.window = {
    getSelection: () => ({
        addRange: () => {},
        removeAllRanges: () => {},
        rangeCount: 0,
        getRangeAt: () => null,
        toString: () => '',
    }),
    open: vi.fn(),
};

// Mock navigator
global.navigator = {
    clipboard: {
        writeText: vi.fn(),
    },
};

// Mock console.time and console.timeEnd
global.console.time = global.console.time || (() => {});
global.console.timeEnd = global.console.timeEnd || (() => {});

// Mock URL (preserve constructor functionality)
const OriginalURL = global.URL;
global.URL = class URL extends OriginalURL {
    constructor(...args) {
        super(...args);
    }
};
global.URL.createObjectURL = vi.fn(() => 'blob:test');
global.URL.revokeObjectURL = vi.fn();