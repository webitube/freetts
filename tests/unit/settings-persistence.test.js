import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as settingsPersistence from '../../src/settings-persistence.js';

// Mock debug-log module
vi.mock('../../src/debug-log.js', () => ({
    debugLog: vi.fn(),
    debugLogEnd: vi.fn(),
    debugWarn: vi.fn(),
    debugWarnEnd: vi.fn(),
    debugError: vi.fn(),
    debugErrorEnd: vi.fn(),
}));

describe('settings-persistence.js', () => {
    let mockElements;
    const STORAGE_KEY = 'freetts-settings';

    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
        
        // Mock DOM elements
        mockElements = {
            engineSelect: { value: 'webspeech' },
            voiceSelect: { value: 'voice1' },
            speedSlider: { value: '1' },
            speedVal: { textContent: '' },
            pitchSlider: { value: '0' },
            pitchVal: { textContent: '' },
        };
    });

    afterEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    describe('getStorageKey', () => {
        it('should return the storage key', () => {
            expect(settingsPersistence.getStorageKey()).toBe(STORAGE_KEY);
        });
    });

    describe('saveTTSSettings', () => {
        it('should save settings to localStorage', () => {
            settingsPersistence.saveTTSSettings(mockElements);
            
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            expect(saved).toBeDefined();
            expect(saved.engine).toBe('webspeech');
            expect(saved.voices.webspeech).toBe('voice1');
            expect(saved.speed).toBe('1');
            expect(saved.pitch).toBe('0');
        });

        it('should save with saveEngineOnly flag', () => {
            // First save complete settings
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                engine: 'webspeech',
                voices: { webspeech: 'voice1', kokoro: 'voice2' },
                speed: 1,
                pitch: 0
            }));

            // Change elements
            mockElements.engineSelect.value = 'kokoro';
            mockElements.voiceSelect.value = 'voice3';
            mockElements.speedSlider.value = '1.5';
            mockElements.pitchSlider.value = '2';

            // Save with engine only flag
            settingsPersistence.saveTTSSettings(mockElements, true);

            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            // Voices should not be updated when saveEngineOnly is true
            expect(saved.voices.webspeech).toBe('voice1');
        });
    });

    describe('loadTTSSettings', () => {
        it('should load settings from localStorage', () => {
            const settings = {
                engine: 'kokoro',
                voices: { webspeech: 'voice1', kokoro: 'voice2' },
                speed: 1.5,
                pitch: 2
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

            const result = settingsPersistence.loadTTSSettings(mockElements);

            expect(result.engine).toBe('kokoro');
            expect(result.voice).toBe('voice2');
            expect(mockElements.engineSelect.value).toBe('kokoro');
            expect(mockElements.voiceSelect.value).toBe('voice2');
            expect(mockElements.speedSlider.value).toBe(1.5);
            expect(mockElements.pitchSlider.value).toBe(2);
        });

        it('should return defaults when no settings exist', () => {
            const result = settingsPersistence.loadTTSSettings(mockElements);

            expect(result.engine).toBe('webspeech');
            expect(result.voice).toBe('');
        });

        it('should handle invalid JSON gracefully', () => {
            localStorage.setItem(STORAGE_KEY, 'invalid json');

            const result = settingsPersistence.loadTTSSettings(mockElements);

            expect(result.engine).toBe('webspeech');
            expect(result.voice).toBe('');
        });

        it('should handle partial settings', () => {
            const settings = {
                engine: 'kokoro',
                voices: { kokoro: 'voice3' }
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

            const result = settingsPersistence.loadTTSSettings(mockElements);

            expect(result.engine).toBe('kokoro');
            // Should fall back to default for webspeech voice
        });
    });

    describe('resetTTSSettings', () => {
        it('should reset settings to defaults', () => {
            // Save some settings first
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                engine: 'kokoro',
                voices: { webspeech: 'voice1', kokoro: 'voice2' },
                speed: 2,
                pitch: 5
            }));

            let statusMessage = '';
            const statusCallback = (msg) => { statusMessage = msg; };

            const mockEditorManager = {
                switchToSource: vi.fn()
            };

            settingsPersistence.resetTTSSettings(mockElements, statusCallback, mockEditorManager);

            // Note: resetTTSSettings saves defaults back to localStorage at the end
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            expect(saved.engine).toBe('webspeech');
            expect(saved.voices.webspeech).toBe('');
            expect(saved.voices.kokoro).toBe('');
            expect(mockElements.engineSelect.value).toBe('webspeech');
            expect(mockElements.voiceSelect.value).toBe('');
            expect(mockElements.speedSlider.value).toBe(1);
            expect(mockElements.pitchSlider.value).toBe(0);
            expect(mockEditorManager.switchToSource).toHaveBeenCalled();
            expect(statusMessage).toBe('Settings reset.');
        });

        it('should work without editorManager', () => {
            let statusMessage = '';
            const statusCallback = (msg) => { statusMessage = msg; };

            settingsPersistence.resetTTSSettings(mockElements, statusCallback, null);

            expect(mockElements.engineSelect.value).toBe('webspeech');
            expect(statusMessage).toBe('Settings reset.');
        });
    });

    describe('getSavedVoice', () => {
        it('should return saved voice for engine', () => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                voices: { webspeech: 'myVoice', kokoro: 'kokoroVoice' }
            }));

            expect(settingsPersistence.getSavedVoice('webspeech')).toBe('myVoice');
            expect(settingsPersistence.getSavedVoice('kokoro')).toBe('kokoroVoice');
        });

        it('should return undefined for missing engine', () => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                voices: { webspeech: 'myVoice' }
            }));

            expect(settingsPersistence.getSavedVoice('kokoro')).toBeUndefined();
        });
    });

    describe('setSavedVoice', () => {
        it('should modify voices in memory (but not save to localStorage)', () => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                voices: { webspeech: 'oldVoice', kokoro: 'oldKokoro' }
            }));

            // Note: setSavedVoice modifies the in-memory object but doesn't save to localStorage
            settingsPersistence.setSavedVoice('webspeech', 'newVoice');

            // The localStorage should remain unchanged since setSavedVoice doesn't save
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            expect(saved.voices.webspeech).toBe('oldVoice'); // Still oldVoice
        });

        it('should warn when settings are undefined', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            
            settingsPersistence.setSavedVoice('webspeech', 'testVoice');

            expect(warnSpy).toHaveBeenCalled();
            warnSpy.mockRestore();
        });
    });

    describe('saveIfNoSettings', () => {
        it('should save settings if none exist', () => {
            expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

            settingsPersistence.saveIfNoSettings(mockElements);

            // After saveIfNoSettings, localStorage should have saved settings
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            expect(saved).not.toBeNull();
            expect(saved.engine).toBe('webspeech');
        });

        it('should not save if settings already exist', () => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ test: 'existing' }));

            settingsPersistence.saveIfNoSettings(mockElements);

            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            expect(saved.test).toBe('existing');
        });
    });
});