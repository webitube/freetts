import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

// Mock global-switches
vi.mock('../../src/global-switches', () => ({
    getDebugMode: vi.fn(() => false),
    setDebugMode: vi.fn(),
}));

describe('Integration: Settings Persistence Flow', () => {
    let mockElements;
    const STORAGE_KEY = 'freetts-settings';

    beforeEach(() => {
        localStorage.clear();
        // Reset AppStore to defaults to prevent state leakage between tests
        AppStore.instance.resetToDefaults();
        localStorage.clear(); // Clear the reset save so each test starts fresh
        
        mockElements = {
            engineSelect: { value: 'webspeech' },
            voiceSelect: { value: 'Voice 1' },
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

    describe('Save-Load-Reset Flow', () => {
        it('should complete full save-load-reset cycle', () => {
            // Step 1: Save settings
            settingsPersistence.saveTTSSettings(mockElements);
            expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
            
            // Step 2: Modify elements
            mockElements.engineSelect.value = 'kokoro';
            mockElements.voiceSelect.value = 'kokoro-voice';
            mockElements.speedSlider.value = '1.5';
            mockElements.pitchSlider.value = '2';
            
            // Step 3: Load settings (should restore to saved)
            const loaded = settingsPersistence.loadTTSSettings(mockElements);
            expect(loaded.engine).toBe('webspeech'); // Should restore saved engine
            expect(loaded.voice).toBe('Voice 1');
            
            // Step 4: Reset settings
            let statusMessage = '';
            const statusCallback = (msg) => { statusMessage = msg; };
            
            settingsPersistence.resetTTSSettings(mockElements, statusCallback, null);
            expect(statusMessage).toBe('Settings reset.');
            expect(mockElements.engineSelect.value).toBe('webspeech');
        });

        it('should persist settings across page reload simulation', () => {
            // Save settings
            mockElements.engineSelect.value = 'kokoro';
            mockElements.voiceSelect.value = 'af_heart';
            mockElements.speedSlider.value = '1.2';
            mockElements.pitchSlider.value = '1';
            
            settingsPersistence.saveTTSSettings(mockElements);
            
            // Simulate page reload by creating new elements object
            const newElements = {
                engineSelect: { value: '' },
                voiceSelect: { value: '' },
                speedSlider: { value: '' },
                speedVal: { textContent: '' },
                pitchSlider: { value: '' },
                pitchVal: { textContent: '' },
            };
            
            // Load settings into new elements
            const loaded = settingsPersistence.loadTTSSettings(newElements);
            
            expect(loaded.engine).toBe('kokoro');
            expect(loaded.voice).toBe('af_heart');
            expect(newElements.speedSlider.value).toBe('1.2');
            expect(newElements.pitchSlider.value).toBe('1');
        });
    });

    describe('Engine Switching with Settings', () => {
        it('should maintain separate voices for each engine', () => {
            // Save webspeech settings
            mockElements.engineSelect.value = 'webspeech';
            mockElements.voiceSelect.value = 'web-voice-1';
            settingsPersistence.saveTTSSettings(mockElements);

            // Switch to kokoro and save
            mockElements.engineSelect.value = 'kokoro';
            mockElements.voiceSelect.value = 'kokoro-voice-1';
            settingsPersistence.saveTTSSettings(mockElements);

            // Load and verify both voices preserved (AppStore uses savedVoices dict)
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            expect(saved.savedVoices.webspeech).toBe('web-voice-1');
            expect(saved.savedVoices.kokoro).toBe('kokoro-voice-1');
        });

        it('should restore correct voice for selected engine', () => {
            // Save different voices for each engine via AppStore
            AppStore.instance.engine.set('webspeech');
            AppStore.instance.savedVoices.set('webspeech', 'web-voice');
            AppStore.instance.savedVoices.set('kokoro', 'kokoro-voice');
            AppStore.instance.saveToLocalStorage();

            const elements = {
                engineSelect: { value: '' },
                voiceSelect: { value: '' },
                speedSlider: { value: '' },
                speedVal: { textContent: '' },
                pitchSlider: { value: '' },
                pitchVal: { textContent: '' },
            };

            settingsPersistence.loadTTSSettings(elements);
            expect(elements.voiceSelect.value).toBe('web-voice');

            // Switch engine and save settings for kokoro
            elements.engineSelect.value = 'kokoro';
            elements.voiceSelect.value = 'kokoro-voice';
            settingsPersistence.saveTTSSettings(elements);

            // Now load again - should restore kokoro voice
            const loaded = settingsPersistence.loadTTSSettings(elements);
            expect(loaded.engine).toBe('kokoro');
            expect(loaded.voice).toBe('kokoro-voice');
        });
    });

    describe('Settings Validation', () => {
        it('should handle missing speed/pitch gracefully', () => {
            // Save partial settings via AppStore
            AppStore.instance.engine.set('webspeech');
            AppStore.instance.savedVoices.set('webspeech', 'voice');
            AppStore.instance.saveToLocalStorage();

            const elements = {
                engineSelect: { value: '' },
                voiceSelect: { value: '' },
                speedSlider: { value: '' },
                speedVal: { textContent: '' },
                pitchSlider: { value: '' },
                pitchVal: { textContent: '' },
            };

            const loaded = settingsPersistence.loadTTSSettings(elements);
            expect(loaded.engine).toBe('webspeech');
            expect(loaded.voice).toBe('voice');
        });

        it('should handle corrupt settings data', () => {
            localStorage.setItem(STORAGE_KEY, 'invalid json {{{');

            const elements = {
                engineSelect: { value: '' },
                voiceSelect: { value: '' },
                speedSlider: { value: '' },
                speedVal: { textContent: '' },
                pitchSlider: { value: '' },
                pitchVal: { textContent: '' },
            };

            const loaded = settingsPersistence.loadTTSSettings(elements);
            expect(loaded.engine).toBe('webspeech'); // Should fall back to default
            expect(loaded.voice).toBe('');
        });
    });

    describe('Initial Setup Flow', () => {
        it('should save settings on first use via saveIfNoSettings', () => {
            expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

            settingsPersistence.saveIfNoSettings(mockElements);

            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            expect(saved.engine).toBe('webspeech');
            // AppStore serializes voices as savedVoices dict
            expect(saved.savedVoices.webspeech).toBe('Voice 1');
        });

        it('should not overwrite existing settings via saveIfNoSettings', () => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                engine: 'kokoro',
                voices: { kokoro: 'existing-voice' },
                speed: 1.5,
                pitch: 2
            }));
            
            settingsPersistence.saveIfNoSettings(mockElements);
            
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            expect(saved.engine).toBe('kokoro');
            expect(saved.voices.kokoro).toBe('existing-voice');
        });
    });
});