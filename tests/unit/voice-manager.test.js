import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadWebSpeechVoices, loadKokoroVoices } from '../../src/voice-manager.js';

// Mock settings-persistence
vi.mock('../../src/settings-persistence.js', () => ({
    saveIfNoSettings: vi.fn(),
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

import { saveIfNoSettings, setSavedVoice } from '../../src/settings-persistence.js';

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
        it('should populate voice select options', () => {
            const voices = loadWebSpeechVoices(mockElements, mockSynth);
            
            expect(mockElements.voiceSelect.innerHTML).toContain('Voice 1');
            expect(mockElements.voiceSelect.innerHTML).toContain('Voice 2');
            expect(mockElements.voiceSelect.innerHTML).toContain('en-US');
            expect(mockElements.voiceSelect.innerHTML).toContain('en-GB');
        });

        it('should return voices array', () => {
            const voices = loadWebSpeechVoices(mockElements, mockSynth);
            
            expect(Array.isArray(voices)).toBe(true);
            expect(voices.length).toBe(2);
        });

        it('should restore saved voice by name', () => {
            loadWebSpeechVoices(mockElements, mockSynth, 'Voice 1');
            
            expect(mockElements.voiceSelect.value).toBe('Voice 1');
        });

        it('should handle saved voice as old index', () => {
            // If saved voice looks like a number, convert to actual voice name
            loadWebSpeechVoices(mockElements, mockSynth, '1');
            
            expect(mockElements.voiceSelect.value).toBe('Voice 2');
        });

        it('should default to first voice if saved voice not found', () => {
            loadWebSpeechVoices(mockElements, mockSynth, 'Nonexistent Voice');
            
            expect(mockElements.voiceSelect.value).toBe('Voice 1');
        });

        it('should set first voice when no saved voice', () => {
            loadWebSpeechVoices(mockElements, mockSynth, '');
            
            expect(mockElements.voiceSelect.value).toBe('Voice 1');
        });

        it('should call setSavedVoice when setting default', () => {
            loadWebSpeechVoices(mockElements, mockSynth, '');
            
            expect(setSavedVoice).toHaveBeenCalledWith('webspeech', 'Voice 1');
        });

        it('should handle empty voices array', () => {
            mockSynth.getVoices = () => [];
            
            loadWebSpeechVoices(mockElements, mockSynth, '');
            
            expect(mockElements.voiceSelect.value).toBe('');
        });
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

        it('should call saveIfNoSettings', () => {
            const kokoroVoices = {
                af_heart: { name: 'Heart', language: 'en-us', gender: 'Female' },
            };

            loadKokoroVoices(mockElements, kokoroVoices, '');
            
            expect(saveIfNoSettings).toHaveBeenCalledWith(mockElements);
        });

        it('should handle empty Kokoro voices object', () => {
            loadKokoroVoices(mockElements, {}, '');
            
            expect(mockElements.voiceSelect.value).toBe('');
        });
    });
});