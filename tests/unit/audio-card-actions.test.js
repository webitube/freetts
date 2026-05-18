import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioCardActions } from '../../src/audio-card-actions.js';
import { ReactiveStore } from '../../src/reactive-store.js';
import { ReactiveValue } from '../../src/reactive-value.js';

describe('AudioCardActions', () => {
    let actions;
    let store;

    beforeEach(() => {
        // Reset singleton before each test
        if (ReactiveStore.instance) {
            ReactiveStore.instance.clear();
        }
        ReactiveStore.instance = null;
        store = new ReactiveStore();
        actions = new AudioCardActions(store);
    });

    afterEach(() => {
        // Clean up singleton after each test
        if (ReactiveStore.instance) {
            ReactiveStore.instance.clear();
        }
        ReactiveStore.instance = null;
    });

    describe('addChunk', () => {
        it('should add a chunk to the store', () => {
            const chunk = { text: 'hello', audio: null };
            actions.addChunk(chunk);
            expect(actions.getAllChunks()).toEqual([chunk]);
        });

        it('should append to existing chunks', () => {
            const chunk1 = { text: 'hello', audio: null };
            const chunk2 = { text: 'world', audio: null };
            actions.addChunk(chunk1);
            actions.addChunk(chunk2);
            expect(actions.getAllChunks()).toEqual([chunk1, chunk2]);
        });

        it('should notify subscribers when chunks change', () => {
            const chunks = store.register('chunks', []);
            const callback = vi.fn();
            chunks.subscribe(callback);
            actions.addChunk({ text: 'hello', audio: null });
            expect(callback).toHaveBeenCalledWith(
                [{ text: 'hello', audio: null }],
                []
            );
        });

        it('should handle adding chunks when store has no chunks key', () => {
            // Remove the chunks key from the store
            store.clear();
            actions.addChunk({ text: 'hello', audio: null });
            expect(actions.getAllChunks()).toEqual([{ text: 'hello', audio: null }]);
        });
    });

    describe('updateChunk', () => {
        it('should update an existing chunk', () => {
            const chunk1 = { text: 'hello', audio: null };
            const chunk2 = { text: 'world', audio: null };
            actions.addChunk(chunk1);
            actions.updateChunk(0, chunk2);
            expect(actions.getAllChunks()).toEqual([chunk2]);
        });

        it('should not update if index is out of range', () => {
            const chunk1 = { text: 'hello', audio: null };
            const chunk2 = { text: 'world', audio: null };
            actions.addChunk(chunk1);
            actions.updateChunk(5, chunk2);
            expect(actions.getAllChunks()).toEqual([chunk1]);
        });

        it('should not update if index is negative', () => {
            const chunk1 = { text: 'hello', audio: null };
            const chunk2 = { text: 'world', audio: null };
            actions.addChunk(chunk1);
            actions.updateChunk(-1, chunk2);
            expect(actions.getAllChunks()).toEqual([chunk1]);
        });

        it('should not update if no chunks exist', () => {
            const chunk = { text: 'hello', audio: null };
            actions.updateChunk(0, chunk);
            expect(actions.getAllChunks()).toEqual([]);
        });

        it('should notify subscribers when chunk is updated', () => {
            const chunks = store.register('chunks', []);
            const callback = vi.fn();
            chunks.subscribe(callback);
            actions.addChunk({ text: 'hello', audio: null });
            actions.updateChunk(0, { text: 'world', audio: null });
            expect(callback).toHaveBeenCalledWith(
                [{ text: 'world', audio: null }],
                [{ text: 'hello', audio: null }]
            );
        });
    });

    describe('removeChunk', () => {
        it('should remove a chunk by index', () => {
            const chunk1 = { text: 'hello', audio: null };
            const chunk2 = { text: 'world', audio: null };
            actions.addChunk(chunk1);
            actions.addChunk(chunk2);
            actions.removeChunk(0);
            expect(actions.getAllChunks()).toEqual([chunk2]);
        });

        it('should not remove if index is out of range', () => {
            const chunk1 = { text: 'hello', audio: null };
            actions.addChunk(chunk1);
            actions.removeChunk(5);
            expect(actions.getAllChunks()).toEqual([chunk1]);
        });

        it('should not remove if index is negative', () => {
            const chunk1 = { text: 'hello', audio: null };
            actions.addChunk(chunk1);
            actions.removeChunk(-1);
            expect(actions.getAllChunks()).toEqual([chunk1]);
        });

        it('should not remove if no chunks exist', () => {
            actions.removeChunk(0);
            expect(actions.getAllChunks()).toEqual([]);
        });

        it('should clean up associated states when chunk is removed', () => {
            const chunk1 = { text: 'hello', audio: null };
            const chunk2 = { text: 'world', audio: null };
            actions.addChunk(chunk1);
            actions.addChunk(chunk2);
            actions.setCardPlaying(0, true);
            actions.setCardActive(1, true);
            actions.setChunkPlaying(0, true);
            actions.removeChunk(0);
            expect(actions.getCardPlaying(0).get()).toBe(false);
            expect(actions.getCardActive(1).get()).toBe(true);
            expect(actions.getChunkPlaying(0).get()).toBe(false);
        });

        it('should notify subscribers when chunk is removed', () => {
            const chunks = store.register('chunks', []);
            const callback = vi.fn();
            chunks.subscribe(callback);
            actions.addChunk({ text: 'hello', audio: null });
            actions.addChunk({ text: 'world', audio: null });
            actions.removeChunk(0);
            expect(callback).toHaveBeenCalledWith(
                [{ text: 'world', audio: null }],
                [{ text: 'hello', audio: null }, { text: 'world', audio: null }]
            );
        });
    });

    describe('clearChunks', () => {
        it('should clear all chunks', () => {
            actions.addChunk({ text: 'hello', audio: null });
            actions.addChunk({ text: 'world', audio: null });
            actions.clearChunks();
            expect(actions.getAllChunks()).toEqual([]);
        });

        it('should clean up all associated states', () => {
            actions.addChunk({ text: 'hello', audio: null });
            actions.addChunk({ text: 'world', audio: null });
            actions.setCardPlaying(0, true);
            actions.setCardActive(1, true);
            actions.setChunkPlaying(0, true);
            actions.clearChunks();
            expect(actions.getCardPlaying(0).get()).toBe(false);
            expect(actions.getCardActive(1).get()).toBe(false);
            expect(actions.getChunkPlaying(0).get()).toBe(false);
        });

        it('should notify subscribers when chunks are cleared', () => {
            const chunks = store.register('chunks', []);
            const callback = vi.fn();
            chunks.subscribe(callback);
            actions.addChunk({ text: 'hello', audio: null });
            actions.clearChunks();
            expect(callback).toHaveBeenCalledWith([], [{ text: 'hello', audio: null }]);
        });
    });

    describe('getChunk', () => {
        it('should return a chunk by index', () => {
            const chunk = { text: 'hello', audio: null };
            actions.addChunk(chunk);
            expect(actions.getChunk(0)).toBe(chunk);
        });

        it('should return null for out of range index', () => {
            actions.addChunk({ text: 'hello', audio: null });
            expect(actions.getChunk(5)).toBeNull();
        });

        it('should return null for negative index', () => {
            actions.addChunk({ text: 'hello', audio: null });
            expect(actions.getChunk(-1)).toBeNull();
        });

        it('should return null when no chunks exist', () => {
            expect(actions.getChunk(0)).toBeNull();
        });
    });

    describe('getAllChunks', () => {
        it('should return all chunks', () => {
            const chunk1 = { text: 'hello', audio: null };
            const chunk2 = { text: 'world', audio: null };
            actions.addChunk(chunk1);
            actions.addChunk(chunk2);
            expect(actions.getAllChunks()).toEqual([chunk1, chunk2]);
        });

        it('should return empty array when no chunks exist', () => {
            expect(actions.getAllChunks()).toEqual([]);
        });
    });

    describe('setCurrentChunkIndex', () => {
        it('should set the current chunk index', () => {
            actions.setCurrentChunkIndex(5);
            expect(actions.getCurrentChunkIndex().get()).toBe(5);
        });

        it('should notify subscribers when index changes', () => {
            const currentChunkIndex = actions.getCurrentChunkIndex();
            const callback = vi.fn();
            currentChunkIndex.subscribe(callback);
            actions.setCurrentChunkIndex(5);
            expect(callback).toHaveBeenCalledWith(5, -1);
        });
    });

    describe('setIsSpeaking', () => {
        it('should set the speaking state', () => {
            actions.setIsSpeaking(true);
            expect(actions.isSpeaking.get()).toBe(true);
        });

        it('should notify subscribers when speaking state changes', () => {
            const isSpeaking = actions.getIsSpeaking();
            const callback = vi.fn();
            isSpeaking.subscribe(callback);
            actions.setIsSpeaking(true);
            expect(callback).toHaveBeenCalledWith(true, false);
        });
    });

    describe('setChunkPlaying', () => {
        it('should set a chunk playing state', () => {
            actions.setChunkPlaying(0, true);
            expect(actions.getChunkPlaying(0).get()).toBe(true);
        });

        it('should update the chunkPlayingStates map', () => {
            actions.setChunkPlaying(0, true);
            const states = actions.getChunkPlayingStates();
            expect(states.get().get(0)).toBe(true);
        });

        it('should handle setting to false', () => {
            actions.setChunkPlaying(0, true);
            actions.setChunkPlaying(0, false);
            expect(actions.getChunkPlaying(0).get()).toBe(false);
        });
    });

    describe('setChunkPlayingStates', () => {
        it('should set all chunk playing states', () => {
            const states = new Map([[0, true], [1, false]]);
            actions.setChunkPlayingStates(states);
            const result = store.get('chunkPlayingStates').get();
            expect(result.get(0)).toBe(true);
            expect(result.get(1)).toBe(false);
        });

        it('should notify subscribers when states change', () => {
            const chunkPlayingStates = actions.getChunkPlayingStates();
            const callback = vi.fn();
            chunkPlayingStates.subscribe(callback);
            const states = new Map([[0, true]]);
            actions.setChunkPlayingStates(states);
            expect(callback).toHaveBeenCalledWith(states, new Map());
        });
    });

    describe('setCardActive', () => {
        it('should set a card active state', () => {
            actions.setCardActive(0, true);
            expect(actions.getCardActive(0).get()).toBe(true);
        });

        it('should update the cardActiveStates map', () => {
            actions.setCardActive(0, true);
            const states = store.get('cardActiveStates');
            expect(states.get().get(0)).toBe(true);
        });

        it('should handle setting to false', () => {
            actions.setCardActive(0, true);
            actions.setCardActive(0, false);
            expect(actions.getCardActive(0).get()).toBe(false);
        });
    });

    describe('setCardActiveStates', () => {
        it('should set all card active states', () => {
            const states = new Map([[0, true], [1, false]]);
            actions.setCardActiveStates(states);
            const result = store.get('cardActiveStates').get();
            expect(result.get(0)).toBe(true);
            expect(result.get(1)).toBe(false);
        });

        it('should notify subscribers when states change', () => {
            const cardActiveStates = store.get('cardActiveStates');
            const callback = vi.fn();
            cardActiveStates.subscribe(callback);
            const states = new Map([[0, true]]);
            actions.setCardActiveStates(states);
            expect(callback).toHaveBeenCalledWith(states, new Map());
        });
    });

    describe('setCardPlaying', () => {
        it('should set a card playing state', () => {
            actions.setCardPlaying(0, true);
            expect(actions.getCardPlaying(0).get()).toBe(true);
        });

        it('should update the cardPlayingStates map', () => {
            actions.setCardPlaying(0, true);
            const states = store.get('cardPlayingStates');
            expect(states.get().get(0)).toBe(true);
        });

        it('should handle setting to false', () => {
            actions.setCardPlaying(0, true);
            actions.setCardPlaying(0, false);
            expect(actions.getCardPlaying(0).get()).toBe(false);
        });
    });

    describe('setCardPlayingStates', () => {
        it('should set all card playing states', () => {
            const states = new Map([[0, true], [1, false]]);
            actions.setCardPlayingStates(states);
            const result = store.get('cardPlayingStates').get();
            expect(result.get(0)).toBe(true);
            expect(result.get(1)).toBe(false);
        });

        it('should notify subscribers when states change', () => {
            const cardPlayingStates = store.get('cardPlayingStates');
            const callback = vi.fn();
            cardPlayingStates.subscribe(callback);
            const states = new Map([[0, true]]);
            actions.setCardPlayingStates(states);
            expect(callback).toHaveBeenCalledWith(states, new Map());
        });
    });

    describe('setStatusMessage', () => {
        it('should set the status message', () => {
            actions.setStatusMessage('loading');
            expect(actions.getStatusMessage().get()).toBe('loading');
        });

        it('should notify subscribers when status message changes', () => {
            const statusMessage = store.get('statusMessage');
            const callback = vi.fn();
            statusMessage.subscribe(callback);
            actions.setStatusMessage('loading');
            expect(callback).toHaveBeenCalledWith('loading', '');
        });
    });

    describe('setStatus', () => {
        it('should set the playback status', () => {
            actions.setStatus('loading');
            expect(actions.getStatus().get()).toBe('loading');
        });

        it('should notify subscribers when status changes', () => {
            const status = store.get('status');
            const callback = vi.fn();
            status.subscribe(callback);
            actions.setStatus('loading');
            expect(callback).toHaveBeenCalledWith('loading', 'ready');
        });

        it('should handle all valid status values', () => {
            actions.setStatus('ready');
            expect(actions.getStatus().get()).toBe('ready');
            actions.setStatus('loading');
            expect(actions.getStatus().get()).toBe('loading');
            actions.setStatus('generating');
            expect(actions.getStatus().get()).toBe('generating');
            actions.setStatus('error');
            expect(actions.getStatus().get()).toBe('error');
        });
    });

    describe('cleanup methods', () => {
        it('should clean up all states when chunks are cleared', () => {
            actions.addChunk({ text: 'hello', audio: null });
            actions.setCardPlaying(0, true);
            actions.setCardActive(0, true);
            actions.setChunkPlaying(0, true);
            actions.clearChunks();
            expect(actions.getCardPlaying(0).get()).toBe(false);
            expect(actions.getCardActive(0).get()).toBe(false);
            expect(actions.getChunkPlaying(0).get()).toBe(false);
        });

        it('should clean up states when a chunk is removed', () => {
            actions.addChunk({ text: 'hello', audio: null });
            actions.addChunk({ text: 'world', audio: null });
            actions.setCardPlaying(0, true);
            actions.setCardActive(1, true);
            actions.setChunkPlaying(0, true);
            actions.removeChunk(0);
            expect(actions.getCardPlaying(0).get()).toBe(false);
            expect(actions.getCardActive(1).get()).toBe(true);
            expect(actions.getChunkPlaying(0).get()).toBe(false);
        });
    });

    describe('edge cases', () => {
        it('should handle operations when store has no chunks key', () => {
            store.clear();
            expect(actions.getAllChunks()).toEqual([]);
            expect(actions.getChunk(0)).toBeNull();
            actions.addChunk({ text: 'hello', audio: null });
            expect(actions.getAllChunks()).toEqual([{ text: 'hello', audio: null }]);
        });

        it('should handle operations when store has no reactive values', () => {
            store.clear();
            actions.setCurrentChunkIndex(5);
            expect(actions.getCurrentChunkIndex().get()).toBe(5);
            actions.setIsSpeaking(true);
            expect(actions.getIsSpeaking().get()).toBe(true);
            actions.setStatus('loading');
            expect(actions.getStatus().get()).toBe('loading');
        });

        it('should handle rapid successive operations', () => {
            for (let i = 0; i < 100; i++) {
                actions.addChunk({ text: `chunk-${i}`, audio: null });
            }
            expect(actions.getAllChunks().length).toBe(100);
        });

        it('should handle operations on non-existent reactive values gracefully', () => {
            // When a reactive value doesn't exist, operations should not crash
            store.clear();
            // These should not throw even though the values don't exist yet
            actions.setChunkPlaying(0, true);
            actions.setCardActive(0, true);
            actions.setCardPlaying(0, true);
        });
    });
});