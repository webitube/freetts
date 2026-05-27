import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as settingsPersistence from '../../src/settings-persistence';
import { AppStore } from '../../src/app-store';

// Mock debug-log module
vi.mock('../../src/debug-log', () => ({
    debugLog: vi.fn(),
    debugLogEnd: vi.fn(),
    debugWarn: vi.fn(),
    debugWarnEnd: vi.fn(),
    debugError: vi.fn(),
    debugErrorEnd: vi.fn(),
}));

describe('settings-persistence.ts', () => {
    let mockElements;
    const STORAGE_KEY = 'freetts-settings';

    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();

        // Reset AppStore to defaults
        AppStore.instance.engine.set('webspeech');
        AppStore.instance.speed.set(1);
        AppStore.instance.pitch.set(0);
        AppStore.instance.savedVoices.set('webspeech', '');
        AppStore.instance.savedVoices.set('kokoro', '');

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
            // AppStore serializes savedVoices as a dict
            expect(saved.savedVoices.webspeech).toBe('voice1');
            expect(saved.speed).toBe(1);
            expect(saved.pitch).toBe(0);
        });

        it('should save with saveEngineOnly flag', () => {
            // First save complete settings
            settingsPersistence.saveTTSSettings(mockElements);

            // Change elements
            mockElements.engineSelect.value = 'kokoro';
            mockElements.voiceSelect.value = 'voice3';
            mockElements.speedSlider.value = '1.5';
            mockElements.pitchSlider.value = '2';

            // Save with engine only flag
            settingsPersistence.saveTTSSettings(mockElements, true);

            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            // Engine should be updated
            expect(saved.engine).toBe('kokoro');
        });
    });

    describe('loadTTSSettings', () => {
        it('should load settings from localStorage', () => {
            // Save settings first
            AppStore.instance.engine.set('kokoro');
            AppStore.instance.savedVoices.set('kokoro', 'voice2');
            AppStore.instance.speed.set(1.5);
            AppStore.instance.pitch.set(2);
            AppStore.instance.saveToLocalStorage();

            const result = settingsPersistence.loadTTSSettings(mockElements);

            expect(result.engine).toBe('kokoro');
            expect(result.voice).toBe('voice2');
            expect(mockElements.engineSelect.value).toBe('kokoro');
            expect(mockElements.voiceSelect.value).toBe('voice2');
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
            // Save partial settings
            AppStore.instance.engine.set('kokoro');
            AppStore.instance.saveToLocalStorage();

            const result = settingsPersistence.loadTTSSettings(mockElements);

            expect(result.engine).toBe('kokoro');
        });
    });

    describe('resetTTSSettings', () => {
        it('should reset settings to defaults', () => {
            // Save some settings first
            AppStore.instance.engine.set('kokoro');
            AppStore.instance.speed.set(2);
            AppStore.instance.pitch.set(5);
            AppStore.instance.saveToLocalStorage();

            let statusMessage = '';
            const statusCallback = (msg) => { statusMessage = msg; };

            const mockEditorManager = {
                switchToSource: vi.fn()
            };

            settingsPersistence.resetTTSSettings(mockElements, statusCallback, mockEditorManager);

            // Note: resetTTSSettings saves defaults back to localStorage at the end
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            expect(saved.engine).toBe('webspeech');
            expect(mockElements.engineSelect.value).toBe('webspeech');
            expect(mockElements.voiceSelect.value).toBe('');
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
            AppStore.instance.savedVoices.set('webspeech', 'myVoice');
            AppStore.instance.savedVoices.set('kokoro', 'kokoroVoice');

            expect(settingsPersistence.getSavedVoice('webspeech')).toBe('myVoice');
            expect(settingsPersistence.getSavedVoice('kokoro')).toBe('kokoroVoice');
        });

        it('should return empty string for missing engine', () => {
            expect(settingsPersistence.getSavedVoice('kokoro')).toBe('');
        });
    });

    describe('setSavedVoice', () => {
        it('should set voice in AppStore', () => {
            settingsPersistence.setSavedVoice('webspeech', 'newVoice');

            expect(AppStore.instance.savedVoices.get('webspeech')).toBe('newVoice');
        });

        it('should not set empty voice', () => {
            settingsPersistence.setSavedVoice('webspeech', '');

            expect(AppStore.instance.savedVoices.get('webspeech')).toBe('');
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