import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TTSController } from '../../src/tts-controller.js';

// Mock highlighting-utils
vi.mock('../../src/highlighting-utils.js', () => ({
    cleanMarkdown: vi.fn((text) => text.replace(/[#*_~`]/g, '')),
}));

// Mock window.speechSynthesis
const mockSpeechSynthesis = {
    getVoices: () => [],
    speak: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    onvoiceschanged: null,
};

Object.defineProperty(global, 'window', {
    value: {
        speechSynthesis: mockSpeechSynthesis,
        getSelection: () => ({
            addRange: () => {},
            removeAllRanges: () => {},
            rangeCount: 0,
            getRangeAt: () => null,
        }),
    },
    writable: true,
    configurable: true,
});

describe('tts-controller.js', () => {
    let ttsController;
    let mockElements;
    let mockEditorManager;
    let mockKokoroPlayer;
    let mockHighlightVisualWord;
    let mockGetVisualCursorInfo;
    let mockVoices;
    let mockIsSafari;

    beforeEach(() => {
     mockElements = {
            engineSelect: { value: 'webspeech' },
            voiceSelect: { value: 'Voice 1' },
            speedSlider: { value: '1' },
            pitchSlider: { value: '0' },
            source: { value: '', selectionStart: 0, selectionEnd: 0 },
            playIcon: { classList: { toggle: vi.fn() } },
            stopIcon: { classList: { toggle: vi.fn() } },
            btnTts: { classList: { toggle: vi.fn() } },
        };

        mockEditorManager = {
            isCurrentlySourceMode: vi.fn(() => true),
        };

        mockKokoroPlayer = {
            play: vi.fn(),
            stop: vi.fn(),
        };

        mockHighlightVisualWord = vi.fn();
        mockGetVisualCursorInfo = vi.fn(() => ({ text: 'test', offset: 0 }));
        mockVoices = [
            { name: 'Voice 1', lang: 'en-US' },
            { name: 'Voice 2', lang: 'en-GB' },
        ];
        mockIsSafari = false;

        ttsController = new TTSController(
            mockElements,
            mockEditorManager,
            mockKokoroPlayer,
            mockHighlightVisualWord,
            mockGetVisualCursorInfo,
            mockVoices,
            mockIsSafari
        );
    });

    afterEach(() => {
        vi.clearAllMocks();
        // Clean up speech synthesis state
        if (mockSpeechSynthesis && typeof mockSpeechSynthesis.cancel === 'function') {
            mockSpeechSynthesis.cancel();
        }
    });

    describe('constructor', () => {
        it('should initialize with default values', () => {
            expect(ttsController.activeEngine).toBe('webspeech');
            expect(ttsController.isSpeaking).toBe(false);
            expect(ttsController.speechOffsetStart).toBe(0);
            expect(ttsController.kokoroTextToSpeak).toBe('');
            expect(ttsController.kokoroStartOffset).toBe(0);
        });

        it('should store all dependencies', () => {
            expect(ttsController.elements).toBe(mockElements);
            expect(ttsController.editorManager).toBe(mockEditorManager);
            expect(ttsController.kokoroPlayer).toBe(mockKokoroPlayer);
        });
    });

    describe('setActiveEngine', () => {
        it('should set engine to webspeech', () => {
            ttsController.setActiveEngine('webspeech');
            expect(ttsController.activeEngine).toBe('webspeech');
        });

        it('should set engine to kokoro', () => {
            ttsController.setActiveEngine('kokoro');
            expect(ttsController.activeEngine).toBe('kokoro');
        });
    });

    describe('getActiveEngine', () => {
        it('should return current engine', () => {
            expect(ttsController.getActiveEngine()).toBe('webspeech');
            
            ttsController.setActiveEngine('kokoro');
            expect(ttsController.getActiveEngine()).toBe('kokoro');
        });
    });

    describe('togglePlayback', () => {
        it('should stop when currently speaking', () => {
            ttsController.isSpeaking = true;
            ttsController.activeEngine = 'webspeech';
            
            const stopWebSpeech = vi.fn();
            const stopKokoro = vi.fn();
            const loadTTSSettings = vi.fn();
            const statusCallback = vi.fn();

            ttsController.togglePlayback(
                stopWebSpeech,
                stopKokoro,
                loadTTSSettings,
                statusCallback
            );

            expect(stopWebSpeech).toHaveBeenCalled();
            expect(stopKokoro).not.toHaveBeenCalled();
        });

        it('should call status callback when no text selected', () => {
            const stopWebSpeech = vi.fn();
            const stopKokoro = vi.fn();
            const loadTTSSettings = vi.fn();
            const statusCallback = vi.fn();

            // Mock empty selection
            global.window.getSelection = () => ({
                toString: () => '',
            });
            mockEditorManager.isCurrentlySourceMode = () => true;
            mockElements.source.value = '';
            mockElements.source.selectionStart = 0;

            ttsController.togglePlayback(
                stopWebSpeech,
                stopKokoro,
                loadTTSSettings,
                statusCallback
            );

            expect(statusCallback).toHaveBeenCalledWith('Please place cursor or select text.');
        });
    });

    describe('speakWithWebSpeech', () => {
        it('should create and speak utterance', () => {
            const stopWebSpeech = vi.fn();
            
            // Mock speech synthesis
            const mockUtterance = {
                onboundary: null,
                onstart: null,
                onend: null,
                onerror: null,
            };
            const originalSpeechSynthesis = window.speechSynthesis;
            window.speechSynthesis = {
                speak: vi.fn((utter) => {
                    // Trigger onstart
                    if (utter.onstart) utter.onstart();
                }),
            };

            ttsController.speakWithWebSpeech('Hello World', 0, stopWebSpeech);

            expect(window.speechSynthesis.speak).toHaveBeenCalled();
            expect(ttsController.isSpeaking).toBe(true);

            window.speechSynthesis = originalSpeechSynthesis;
        });

        it('should apply rate and pitch settings', () => {
            mockElements.speedSlider.value = '1.5';
            mockElements.pitchSlider.value = '2';

            const utterances = [];
            const originalSpeechSynthesis = window.speechSynthesis;
            window.speechSynthesis = {
                speak: vi.fn((utter) => {
                    utterances.push(utter);
                }),
            };

            ttsController.speakWithWebSpeech('Hello', 0, vi.fn());

            expect(utterances[0].rate).toBe(1.5);
            expect(utterances[0].pitch).toBe(1 + 2 / 12);

            window.speechSynthesis = originalSpeechSynthesis;
        });
    });

    describe('stopWebSpeech', () => {
        it('should cancel speech and update state', () => {
            const cancelMock = vi.fn();
            const originalSpeechSynthesis = window.speechSynthesis;
            window.speechSynthesis = { cancel: cancelMock };

            ttsController.stopWebSpeech();

            expect(cancelMock).toHaveBeenCalled();
            expect(ttsController.isSpeaking).toBe(false);

            window.speechSynthesis = originalSpeechSynthesis;
        });
    });

    describe('speakWithKokoro', () => {
        it('should call kokoro player with correct parameters', () => {
            mockElements.voiceSelect.value = 'af_heart';
            mockElements.speedSlider.value = '1.2';

            ttsController.speakWithKokoro('Hello World', 0);

            expect(mockKokoroPlayer.play).toHaveBeenCalledWith(
                'Hello World',
                'af_heart',
                1.2
            );
            expect(ttsController.kokoroTextToSpeak).toBe('Hello World');
            expect(ttsController.kokoroStartOffset).toBe(0);
        });
    });

    describe('stopKokoro', () => {
        it('should call kokoro player stop', () => {
            ttsController.stopKokoro();

            expect(mockKokoroPlayer.stop).toHaveBeenCalled();
        });
    });

    describe('setUIState', () => {
        it('should update UI for active state', () => {
            ttsController.setUIState(true);

            expect(mockElements.playIcon.classList.toggle).toHaveBeenCalledWith('hidden', true);
            expect(mockElements.stopIcon.classList.toggle).toHaveBeenCalledWith('hidden', false);
            expect(mockElements.btnTts.classList.toggle).toHaveBeenNthCalledWith(1, 'text-red-600', true);
            expect(ttsController.isSpeaking).toBe(true);
        });

        it('should update UI for inactive state', () => {
            ttsController.setUIState(false);

            expect(mockElements.playIcon.classList.toggle).toHaveBeenCalledWith('hidden', false);
            expect(mockElements.stopIcon.classList.toggle).toHaveBeenCalledWith('hidden', true);
            expect(mockElements.btnTts.classList.toggle).toHaveBeenNthCalledWith(1, 'text-red-600', false);
            expect(ttsController.isSpeaking).toBe(false);
        });
    });
});