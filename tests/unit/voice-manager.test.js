import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadWebSpeechVoices, loadKokoroVoices } from '../../src/voice-manager.js';

// Mock settings-persistence
vi.mock('../../src/settings-persistence.js', () => ({
    saveIfNoSettings: vi.fn(),
    saveTTSSettings: vi.fn(),
    setSavedVoice: vi.fn(),
}));

// Mock global-switches
vi.mock('../../src/global-switches.js', () => ({
    getDebugMode: vi.fn(() => false),
    setDebugMode: vi.fn(),
}));

// Mock debug-log
vi.mock('../../src/debug-log.js', () => ({
    debugLog: vi.fn(),
    debugLogEnd: vi.fn(),
    debugWarn: vi.fn(),
    debugWarnEnd: vi.fn(),
    debugError: vi.fn(),
    debugErrorEnd: vi.fn(),
}));

import { saveIfNoSettings, saveTTSSettings, setSavedVoice } from '../../src/settings-persistence.js';

describe('voice-manager.js', () => {
    let mockElements;
    let mockSynth;

    beforeEach(() => {
        mockElements = {
            voiceSelect: { 
                value: '',
                innerHTML: '',
                set innerHTML(val) { this._html = val; },
                get innerHTML() { return this._html || ''; }
            },
            engineSelect: { value: 'webspeech' },
        };
        
        mockSynth = {
            getVoices: vi.fn(() => [
                { name: 'Voice 1', lang: 'en-US' },
                { name: 'Voice 2', lang: 'en-GB' },
            ]),
        };
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('loadWebSpeechVoices', () => {
        it('should populate voice select options', async () => {
            const voices = await loadWebSpeechVoices(mockElements, mockSynth);
            
            expect(mockElements.voiceSelect.innerHTML).toContain('Voice 1');
            expect(mockElements.voiceSelect.innerHTML).toContain('Voice 2');
            expect(mockElements.voiceSelect.innerHTML).toContain('en-US');
            expect(mockElements.voiceSelect.innerHTML).toContain('en-GB');
            expect(Array.isArray(voices)).toBe(true);
            expect(voices.length).toBe(2);
        });

        it('should return voices array', async () => {
            const voices = await loadWebSpeechVoices(mockElements, mockSynth);
            
            expect(Array.isArray(voices)).toBe(true);
            expect(voices.length).toBe(2);
        });

        it('should restore saved voice by name', async () => {
            await loadWebSpeechVoices(mockElements, mockSynth, 'Voice 1');
            
            expect(mockElements.voiceSelect.value).toBe('Voice 1');
        });

        it('should handle saved voice as old index', async () => {
            // If saved voice looks like a number, convert to actual voice name
            await loadWebSpeechVoices(mockElements, mockSynth, '1');
            
            expect(mockElements.voiceSelect.value).toBe('Voice 2');
        });

        it('should default to first voice if saved voice not found', async () => {
            await loadWebSpeechVoices(mockElements, mockSynth, 'Nonexistent Voice');
            
            expect(mockElements.voiceSelect.value).toBe('Voice 1');
        });

        it('should set first voice when no saved voice', async () => {
            await loadWebSpeechVoices(mockElements, mockSynth, '');
            
            expect(mockElements.voiceSelect.value).toBe('Voice 1');
        });

        it('should call saveTTSSettings when setting default', async () => {
            await loadWebSpeechVoices(mockElements, mockSynth, '');
            
            expect(saveTTSSettings).toHaveBeenCalledWith(mockElements);
        });

        it('should handle empty voices array with voiceschanged event', async () => {
            let voicesLoaded = false;
            mockSynth.getVoices = () => {
                if (voicesLoaded) {
                    return [
                        { name: 'Voice 1', lang: 'en-US' },
                        { name: 'Voice 2', lang: 'en-GB' },
                    ];
                }
                return [];
            };
            
            // Simulate voices becoming available via voiceschanged event
            const voiceschangedCallbacks = [];
            mockSynth.addEventListener = (event, callback) => {
                if (event === 'voiceschanged') voiceschangedCallbacks.push(callback);
            };
            mockSynth.removeEventListener = (event, callback) => {
                const idx = voiceschangedCallbacks.indexOf(callback);
                if (idx >= 0) voiceschangedCallbacks.splice(idx, 1);
            };
            
            const loadPromise = loadWebSpeechVoices(mockElements, mockSynth, '');
            
            // Trigger voiceschanged event — voices are now available
            voicesLoaded = true;
            voiceschangedCallbacks.forEach(cb => cb());
            
            // Wait for promise to resolve
            await loadPromise;
            
            expect(mockElements.voiceSelect.value).toBe('Voice 1');
        });

        it('should use timeout when voiceschanged does not fire', async () => {
            mockSynth.getVoices = () => [];
            
            // Do NOT trigger voiceschanged — let timeout fire instead
            mockSynth.addEventListener = () => {};
            mockSynth.removeEventListener = () => {};
            
            const loadPromise = loadWebSpeechVoices(mockElements, mockSynth, '');
            
            // Wait for timeout (5 seconds) — increase test timeout
            await new Promise(resolve => setTimeout(resolve, 5100));
            
            // Should still populate with whatever voices are available (empty)
            expect(mockElements.voiceSelect.innerHTML).toBe('');
        }, 8000); // Increase test timeout to 8s
    });

    describe('loadKokoroVoices', () => {
        it('should populate voice select with Kokoro voices', () => {
            const kokoroVoices = {
                af_heart: { name: 'Heart', language: 'en-us', gender: 'Female' },
                af_bella: { name: 'Bella', language: 'en-us', gender: 'Female' },
            };

            loadKokoroVoices(mockElements, kokoroVoices);
            
            expect(mockElements.voiceSelect.innerHTML).toContain('af_heart');
            expect(mockElements.voiceSelect.innerHTML).toContain('Heart');
            expect(mockElements.voiceSelect.innerHTML).toContain('American');
            expect(mockElements.voiceSelect.innerHTML).toContain('Female');
        });

        it('should restore saved Kokoro voice', () => {
            const kokoroVoices = {
                af_heart: { name: 'Heart', language: 'en-us', gender: 'Female' },
                af_bella: { name: 'Bella', language: 'en-us', gender: 'Female' },
            };

            loadKokoroVoices(mockElements, kokoroVoices, 'af_bella');
            
            expect(mockElements.voiceSelect.value).toBe('af_bella');
        });

        it('should default to first voice when no saved voice', () => {
            const kokoroVoices = {
                af_heart: { name: 'Heart', language: 'en-us', gender: 'Female' },
                af_bella: { name: 'Bella', language: 'en-us', gender: 'Female' },
            };

            loadKokoroVoices(mockElements, kokoroVoices, '');
            
            expect(mockElements.voiceSelect.value).toBe('af_heart');
        });

        it('should handle empty Kokoro voices object', () => {
            loadKokoroVoices(mockElements, {}, '');
            
            expect(mockElements.voiceSelect.value).toBe('');
        });
    });
});