import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioCardStore } from '../../src/audio-card-store.js';
import { ReactiveStore } from '../../src/reactive-store.js';
import { ReactiveValue } from '../../src/reactive-value.js';

describe('AudioCardStore', () => {
    let audioCardStore;

    beforeEach(() => {
        // Reset singletons before each test
        if (ReactiveStore.instance) {
            ReactiveStore.instance.clear();
        }
        ReactiveStore.instance = null;
        AudioCardStore.resetInstance();
        audioCardStore = new AudioCardStore();
    });

    afterEach(() => {
        // Clean up singleton after each test
        if (ReactiveStore.instance) {
            ReactiveStore.instance.clear();
        }
        ReactiveStore.instance = null;
    });

    describe('getInstance', () => {
        it('should return the same store instance', () => {
            const store1 = AudioCardStore.getInstance();
            const store2 = AudioCardStore.getInstance();
            expect(store1).toBe(store2);
        });

        it('should return an AudioCardStore instance', () => {
            const store = AudioCardStore.getInstance();
            expect(store).toBeInstanceOf(AudioCardStore);
        });
    });

    describe('getStore', () => {
        it('should return the internal ReactiveStore', () => {
            const store = audioCardStore.getStore();
            expect(store).toBeInstanceOf(ReactiveStore);
        });
    });

    describe('chunks', () => {
        it('should return a ReactiveValue with empty array by default', () => {
            const chunks = audioCardStore.chunks;
            expect(chunks).toBeInstanceOf(ReactiveValue);
            expect(chunks.get()).toEqual([]);
        });

        it('should update when set', () => {
            const chunks = audioCardStore.chunks;
            const callback = vi.fn();
            chunks.subscribe(callback);
            const newChunks = [{ text: 'hello', audio: null }];
            chunks.set(newChunks);
            expect(callback).toHaveBeenCalledWith(newChunks, []);
            expect(chunks.get()).toEqual(newChunks);
        });
    });

    describe('isSpeaking', () => {
        it('should return a ReactiveValue with false by default', () => {
            const isSpeaking = audioCardStore.isSpeaking;
            expect(isSpeaking).toBeInstanceOf(ReactiveValue);
            expect(isSpeaking.get()).toBe(false);
        });

        it('should update when set', () => {
            const isSpeaking = audioCardStore.isSpeaking;
            const callback = vi.fn();
            isSpeaking.subscribe(callback);
            isSpeaking.set(true);
            expect(callback).toHaveBeenCalledWith(true, false);
            expect(isSpeaking.get()).toBe(true);
        });
    });

    describe('currentChunkIndex', () => {
        it('should return a ReactiveValue with -1 by default', () => {
            const currentChunkIndex = audioCardStore.getCurrentChunkIndex();
            expect(currentChunkIndex).toBeInstanceOf(ReactiveValue);
            expect(currentChunkIndex.get()).toBe(-1);
        });

        it('should update when set', () => {
            const currentChunkIndex = audioCardStore.getCurrentChunkIndex();
            const callback = vi.fn();
            currentChunkIndex.subscribe(callback);
            currentChunkIndex.set(5);
            expect(callback).toHaveBeenCalledWith(5, -1);
            expect(currentChunkIndex.get()).toBe(5);
        });
    });

    describe('chunkPlayingStates', () => {
        it('should return a ReactiveValue with empty Map by default', () => {
            const chunkPlayingStates = audioCardStore.chunkPlayingStates;
            expect(chunkPlayingStates).toBeInstanceOf(ReactiveValue);
            expect(chunkPlayingStates.get()).toBeInstanceOf(Map);
            expect(chunkPlayingStates.get().size).toBe(0);
        });

        it('should update when set', () => {
            const chunkPlayingStates = audioCardStore.chunkPlayingStates;
            const callback = vi.fn();
            chunkPlayingStates.subscribe(callback);
            const newMap = new Map([[0, true], [1, false]]);
            chunkPlayingStates.set(newMap);
            expect(callback).toHaveBeenCalledWith(newMap, new Map());
            expect(chunkPlayingStates.get().get(0)).toBe(true);
            expect(chunkPlayingStates.get().get(1)).toBe(false);
        });
    });

    describe('cardActiveStates', () => {
        it('should return a ReactiveValue with empty Map by default', () => {
            const cardActiveStates = audioCardStore.cardActiveStates;
            expect(cardActiveStates).toBeInstanceOf(ReactiveValue);
            expect(cardActiveStates.get()).toBeInstanceOf(Map);
            expect(cardActiveStates.get().size).toBe(0);
        });

        it('should update when set', () => {
            const cardActiveStates = audioCardStore.cardActiveStates;
            const callback = vi.fn();
            cardActiveStates.subscribe(callback);
            const newMap = new Map([[0, true], [1, false]]);
            cardActiveStates.set(newMap);
            expect(callback).toHaveBeenCalledWith(newMap, new Map());
            expect(cardActiveStates.get().get(0)).toBe(true);
            expect(cardActiveStates.get().get(1)).toBe(false);
        });
    });

    describe('cardPlayingStates', () => {
        it('should return a ReactiveValue with empty Map by default', () => {
            const cardPlayingStates = audioCardStore.cardPlayingStates;
            expect(cardPlayingStates).toBeInstanceOf(ReactiveValue);
            expect(cardPlayingStates.get()).toBeInstanceOf(Map);
            expect(cardPlayingStates.get().size).toBe(0);
        });

        it('should update when set', () => {
            const cardPlayingStates = audioCardStore.cardPlayingStates;
            const callback = vi.fn();
            cardPlayingStates.subscribe(callback);
            const newMap = new Map([[0, true], [1, false]]);
            cardPlayingStates.set(newMap);
            expect(callback).toHaveBeenCalledWith(newMap, new Map());
            expect(cardPlayingStates.get().get(1)).toBe(false);
        });
    });

    describe('statusMessage', () => {
        it('should return a ReactiveValue with empty string by default', () => {
            const statusMessage = audioCardStore.getStatusMessage();
            expect(statusMessage).toBeInstanceOf(ReactiveValue);
            expect(statusMessage.get()).toBe('');
        });

        it('should update when set', () => {
            const statusMessage = audioCardStore.getStatusMessage();
            const callback = vi.fn();
            statusMessage.subscribe(callback);
            statusMessage.set('loading');
            expect(callback).toHaveBeenCalledWith('loading', '');
            expect(statusMessage.get()).toBe('loading');
        });
    });

    describe('status', () => {
        it('should return a ReactiveValue with ready by default', () => {
            const status = audioCardStore.getStatus();
            expect(status).toBeInstanceOf(ReactiveValue);
            expect(status.get()).toBe('ready');
        });

        it('should update when set', () => {
            const status = audioCardStore.getStatus();
            const callback = vi.fn();
            status.subscribe(callback);
            status.set('loading');
            expect(callback).toHaveBeenCalledWith('loading', 'ready');
            expect(status.get()).toBe('loading');
        });
    });

    describe('chunkCount', () => {
        it('should return a ReactiveValue with 0 by default', () => {
            const chunkCount = audioCardStore.chunkCount;
            expect(chunkCount).toBeInstanceOf(ReactiveValue);
            expect(chunkCount.get()).toBe(0);
        });

        it('should update when chunks change', () => {
            const chunkCount = audioCardStore.chunkCount;
            const callback = vi.fn();
            chunkCount.subscribe(callback);
            const newChunks = [{ text: 'hello', audio: null }];
            audioCardStore.chunks.set(newChunks);
            expect(chunkCount.get()).toBe(1);
        });

        it('should update when chunks are removed', () => {
            audioCardStore.chunks.set([{ text: 'a', audio: null }, { text: 'b', audio: null }]);
            const chunkCount = audioCardStore.chunkCount;
            expect(chunkCount.get()).toBe(2);
            audioCardStore.chunks.set([{ text: 'a', audio: null }]);
            expect(chunkCount.get()).toBe(1);
        });
    });

    describe('per-index reactive values', () => {
        it('should return ReactiveValue for chunkPlaying at index', () => {
            const chunkPlaying = audioCardStore.getChunkPlaying(0);
            expect(chunkPlaying).toBeInstanceOf(ReactiveValue);
            expect(chunkPlaying.get()).toBe(false);
        });

        it('should return ReactiveValue for cardActive at index', () => {
            const cardActive = audioCardStore.getCardActive(0);
            expect(cardActive).toBeInstanceOf(ReactiveValue);
            expect(cardActive.get()).toBe(false);
        });

        it('should return ReactiveValue for cardPlaying at index', () => {
            const cardPlaying = audioCardStore.getCardPlaying(0);
            expect(cardPlaying).toBeInstanceOf(ReactiveValue);
            expect(cardPlaying.get()).toBe(false);
        });

        it('should handle different indices independently', () => {
            const cp0 = audioCardStore.getCardPlaying(0);
            const cp1 = audioCardStore.getCardPlaying(1);
            cp0.set(true);
            expect(cp0.get()).toBe(true);
            expect(cp1.get()).toBe(false);
        });
    });

    describe('singleton consistency', () => {
        it('should share the same ReactiveStore across instances', () => {
            const store1 = new AudioCardStore();
            const store2 = new AudioCardStore();
            const chunks1 = store1.chunks;
            const chunks2 = store2.chunks;
            expect(chunks1).toBe(chunks2);
        });

        it('should share reactive values across instances', () => {
            const store1 = AudioCardStore.getInstance();
            const store2 = AudioCardStore.getInstance();
            const isSpeaking1 = store1.isSpeaking;
            const isSpeaking2 = store2.isSpeaking;
            expect(isSpeaking1).toBe(isSpeaking2);
        });
    });
});
