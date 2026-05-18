/**
 * Global Integration Test - Reactive Architecture
 *
 * Tests the complete integration of all reactive components:
 * - ReactiveValue, ReactiveStore, AudioCardStore, AudioCardActions
 * - KokoroPlayer, ChunkRenderer, ChunkManager, WorkerCommunication
 * - Full playback flow from chunk rendering to audio playback
 */

import { describe, it, expect, beforeEach, afterEach, vi, MockInstance } from 'vitest';
import { AudioCardStore } from '../../src/audio-card-store.js';
import { AudioCardActions } from '../../src/audio-card-actions.js';
import { KokoroPlayer } from '../../src/kokoro-player.js';
import { ChunkRenderer } from '../../src/kokoro-chunk-renderer.js';
import { ChunkManager } from '../../src/kokoro-chunk-manager.js';
import { WorkerCommunication } from '../../src/kokoro-worker-communication.js';
import { AudioPlayer } from '../../src/kokoro-audio-player.js';
import { ReactiveValue } from '../../src/reactive-value.js';

// Mock global navigator for mobile detection
vi.mock('navigator', () => ({
    userAgent: '',
    maxTouchPoints: 0,
}));

describe('Global Integration: Reactive Architecture', () => {
    let mockElements;
    let mockAudioContext;
    let mockBlob;
    let mockWorker;
    let audioCardStore;

    beforeEach(() => {
        // Reset singleton
        ReactiveValue.subscribers = new Map();
        ReactiveValue.notifySubscribers = vi.fn();
        if (AudioCardStore.instance) {
            AudioCardStore.instance = null;
        }

        // Mock DOM elements
        mockElements = {
            container: { id: 'chunk-container', innerHTML: '' },
            engineSelect: { value: 'kokoro' },
            voiceSelect: { value: 'af_heart' },
            speedSlider: { value: '1' },
            pitchSlider: { value: '0' },
        };

        // Mock audio context and blob
        mockAudioContext = {
            createBuffer: vi.fn().mockResolvedValue({
                length: 44100,
                getChannelData: vi.fn().mockReturnValue(new Float32Array(44100)),
            }),
        };

        mockBlob = new Blob(['fake audio data'], { type: 'audio/wav' });
        mockBlob.arrayBuffer = vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4]));
        URL.createObjectURL = vi.fn().mockReturnValue('blob:fake-url');

        // Mock Worker
        mockWorker = {
            postMessage: vi.fn(),
            terminate: vi.fn(),
            onmessage: null,
        };

        audioCardStore = AudioCardStore.getInstance();
    });

    afterEach(() => {
        vi.clearAllMocks();
        if (AudioCardStore.instance) {
            AudioCardStore.instance = null;
        }
        ReactiveValue.subscribers = new Map();
    });

    describe('Complete Playback Flow Integration', () => {
        it('should integrate all components through a full playback lifecycle', async () => {
            const statusMessages = [];
            const activeDeviceMessages = [];
            const uiStateMessages = [];

            // Step 1: Create KokoroPlayer with all callbacks
            const player = new KokoroPlayer(
                'chunk-container',
                (msg) => statusMessages.push(msg),
                (msg) => activeDeviceMessages.push(msg),
                (state) => uiStateMessages.push(state),
                null,
                null
            );

            // Step 2: Verify initial state
            expect(player.status).toBe('ready');
            expect(player.chunks).toEqual([]);
            expect(player.currentChunkIndex).toBe(-1);
            expect(player.isSpeaking).toBe(false);

            // Step 3: Simulate worker ready
            player.workerComm.workerReady = true;
            player.workerComm.worker = mockWorker;

            // Step 4: Start playback
            player.play('Hello world', 'af_heart', 1);

            // Step 5: Verify initial state changes
            expect(statusMessages).toContainEqual(expect.stringContaining('Generating'));
            expect(player.status).toBe('generating');

            // Step 6: Simulate worker sending chunks
            const chunks = [
                { text: 'Hello', audio: mockBlob },
                { text: 'world', audio: mockBlob },
            ];

            // Simulate worker message handling
            player.workerComm._handleWorkerMessage({ data: { chunks } });

            // Step 7: Verify chunks are stored in reactive store
            const storedChunks = audioCardStore.chunks.get();
            expect(storedChunks).toEqual(chunks);
            expect(player.chunks).toEqual(chunks);

            // Step 8: Verify chunk count derived value
            expect(audioCardStore.chunkCount.get()).toBe(2);

            // Step 9: Simulate audio playback completion
            player.status = 'ready';
            player.mergedBlob = mockBlob;
            player.isSpeaking = true;

            // Step 10: Verify isSpeaking propagates
            expect(audioCardStore.isSpeaking.get()).toBe(true);
            expect(uiStateMessages).toContainEqual(true);

            // Step 11: Simulate audio element playing
            player.chunkRenderer.audioElementCallback('play', 0);

            // Step 12: Verify card playing states update
            expect(audioCardStore.cardPlayingStates.get().get(0)).toBe(true);
            expect(audioCardStore.cardActiveStates.get().get(0)).toBe(true);

            // Step 13: Simulate chunk ending (auto-advance)
            player.chunkRenderer.audioElementCallback('ended', 0);
            player.currentChunkIndex = 1;

            // Step 14: Verify current chunk index updates
            expect(audioCardStore.getCurrentChunkIndex().get()).toBe(1);

            // Step 15: Simulate second chunk playing
            player.chunkRenderer.audioElementCallback('play', 1);
            expect(audioCardStore.cardPlayingStates.get().get(1)).toBe(true);

            // Step 16: Simulate stop
            player.stop();

            // Step 17: Verify state cleanup
            expect(player.isSpeaking).toBe(false);
            expect(player.status).toBe('ready');
            expect(uiStateMessages).toContainEqual(false);

            // Step 18: Verify chunks are cleared
            expect(audioCardStore.chunks.get()).toEqual([]);
            expect(player.chunks).toEqual([]);
        });

        it('should handle multiple sequential playbacks with state preservation', async () => {
            const player = new KokoroPlayer(
                'chunk-container',
                () => {},
                () => {},
                () => {},
                null,
                null
            );

            player.workerComm.workerReady = true;
            player.workerComm.worker = mockWorker;

            // First playback
            player.play('First text', 'af_heart', 1);
            player.workerComm._handleWorkerMessage({ data: { chunks: [{ text: 'First', audio: mockBlob }] } });
            player.status = 'ready';
            player.chunkRenderer.audioElementCallback('ended', 0);

            // Second playback with different text
            player.play('Second text', 'cm_jo', 1.5);
            player.workerComm._handleWorkerMessage({ data: { chunks: [{ text: 'Second', audio: mockBlob }] } });
            player.status = 'ready';

            // Verify new chunks replaced old ones
            expect(audioCardStore.chunks.get()).toEqual([{ text: 'Second', audio: mockBlob }]);
            expect(player.currentChunkIndex).toBe(-1);

            // Third playback with same voice
            player.play('Third text', 'af_heart', 1);
            player.workerComm._handleWorkerMessage({ data: { chunks: [{ text: 'Third', audio: mockBlob }] } });

            // Verify state is preserved across playbacks
            expect(audioCardStore.chunkCount.get()).toBe(1);
        });

        it('should handle error states gracefully', async () => {
            const player = new KokoroPlayer(
                'chunk-container',
                (msg) => {},
                () => {},
                () => {},
                null,
                null
            );

            player.workerComm.workerReady = false;
            player.workerComm.worker = mockWorker;

            // Start playback with unready worker
            player.play('Test text', 'af_heart', 1);

            // Should fall back to loading state
            expect(player.status).toBe('loading');
            expect(statusMessages).toContainEqual('Model still loading...');

            // Simulate worker becoming ready
            player.workerComm.workerReady = true;
            player.workerComm._handleWorkerMessage({ data: { chunks: [{ text: 'Recovered', audio: mockBlob }] } });
            player.status = 'ready';

            // Should recover gracefully
            expect(audioCardStore.chunks.get()).toEqual([{ text: 'Recovered', audio: mockBlob }]);
        });
    });

    describe('Reactive State Propagation Integration', () => {
        it('should propagate state changes from actions to all listeners', () => {
            const player = new KokoroPlayer(
                'chunk-container',
                () => {},
                () => {},
                () => {},
                null,
                null
            );

            player.workerComm.workerReady = true;
            player.workerComm.worker = mockWorker;

            // Add chunks
            player.workerComm._handleWorkerMessage({ data: { chunks: [
                { text: 'Chunk 1', audio: mockBlob },
                { text: 'Chunk 2', audio: mockBlob },
            ] } });

            // Simulate chunk ending and auto-advance
            player.chunkRenderer.audioElementCallback('ended', 0);
            player.currentChunkIndex = 1;

            // Simulate second chunk playing
            player.chunkRenderer.audioElementCallback('play', 1);

            // Verify all states updated
            expect(audioCardStore.cardPlayingStates.get().get(1)).toBe(true);
            expect(audioCardStore.cardActiveStates.get().get(1)).toBe(true);
        });

        it('should maintain consistency when chunks are removed', () => {
            const player = new KokoroPlayer(
                'chunk-container',
                () => {},
                () => {},
                () => {},
                null,
                null
            );

            player.workerComm.workerReady = true;
            player.workerComm.worker = mockWorker;

            // Add chunks with states
            player.workerComm._handleWorkerMessage({ data: { chunks: [
                { text: 'Chunk 1', audio: mockBlob },
                { text: 'Chunk 2', audio: mockBlob },
                { text: 'Chunk 3', audio: mockBlob },
            ] } });

            // Set states
            player.chunkRenderer.audioElementCallback('play', 0);
            player.chunkRenderer.audioElementCallback('play', 1);
            player.currentChunkIndex = 0;

            // Simulate chunk removal through worker
            player.workerComm._handleWorkerMessage({ data: { chunks: [
                { text: 'Chunk 2', audio: mockBlob },
                { text: 'Chunk 3', audio: mockBlob },
            ] } });

            // Verify states are cleaned up
            expect(audioCardStore.cardPlayingStates.get().get(0)).toBe(false);
            expect(audioCardStore.cardPlayingStates.get().get(1)).toBe(true);
            expect(audioCardStore.cardPlayingStates.get().get(2)).toBe(false);
            expect(audioCardStore.cardActiveStates.get().get(0)).toBe(false);

            // Verify chunk count updated
            expect(audioCardStore.chunkCount.get()).toBe(2);
        });

        it('should handle rapid state changes correctly', () => {
            const player = new KokoroPlayer(
                'chunk-container',
                () => {},
                () => {},
                () => {},
                null,
                null
            );

            player.workerComm.workerReady = true;
            player.workerComm.worker = mockWorker;

            player.workerComm._handleWorkerMessage({ data: { chunks: [
                { text: 'Chunk 1', audio: mockBlob },
                { text: 'Chunk 2', audio: mockBlob },
            ] } });

            // Simulate rapid auto-advance
            for (let i = 0; i < 10; i++) {
                player.chunkRenderer.audioElementCallback('ended', i);
                player.currentChunkIndex = i + 1;
            }

            // Should only have 2 chunks
            expect(audioCardStore.chunks.get().length).toBe(2);
            expect(audioCardStore.chunkCount.get()).toBe(2);
        });
    });

    describe('ChunkRenderer Integration', () => {
        it('should create chunk cards with correct reactive bindings', () => {
            const player = new KokoroPlayer(
                'chunk-container',
                () => {},
                () => {},
                () => {},
                null,
                null
            );

            player.workerComm.workerReady = true;
            player.workerComm.worker = mockWorker;

            player.workerComm._handleWorkerMessage({ data: { chunks: [
                { text: 'Chunk 1', audio: mockBlob },
                { text: 'Chunk 2', audio: mockBlob },
            ] } });

            // Simulate rendering (the actual renderChunks uses document, but we verify bindings)
            expect(player.chunkRenderer.audioCardStore).toBe(audioCardStore);
            expect(player.chunkRenderer.audioCardActions).toBeInstanceOf(AudioCardActions);

            // Verify audio element callback uses reactive actions
            const callback = player.chunkRenderer.audioElementCallback;
            expect(typeof callback).toBe('function');

            // Simulate play event
            callback('play', 0);
            expect(audioCardStore.cardPlayingStates.get().get(0)).toBe(true);
            expect(audioCardStore.cardActiveStates.get().get(0)).toBe(true);

            // Simulate ended event
            callback('ended', 0);
            expect(audioCardStore.cardPlayingStates.get().get(0)).toBe(false);
        });

        it('should handle click seek correctly', () => {
            const player = new KokoroPlayer(
                'chunk-container',
                () => {},
                () => {},
                () => {},
                null,
                null
            );

            player.workerComm.workerReady = true;
            player.workerComm.worker = mockWorker;

            player.workerComm._handleWorkerMessage({ data: { chunks: [
                { text: 'Chunk 1', audio: mockBlob },
                { text: 'Chunk 2', audio: mockBlob },
            ] } });

            // Simulate click on chunk 1
            player.currentChunkIndex = 1;
            player.chunkRenderer.audioElementCallback('play', 1);

            // Verify state updates
            expect(audioCardStore.getCurrentChunkIndex().get()).toBe(1);
            expect(audioCardStore.cardActiveStates.get().get(1)).toBe(true);
            expect(audioCardStore.cardPlayingStates.get().get(1)).toBe(true);

            // Simulate click on chunk 0
            player.currentChunkIndex = 0;
            player.chunkRenderer.audioElementCallback('play', 0);

            // Verify previous state cleaned up
            expect(audioCardStore.cardActiveStates.get().get(1)).toBe(false);
            expect(audioCardStore.cardPlayingStates.get().get(1)).toBe(false);
            expect(audioCardStore.cardActiveStates.get().get(0)).toBe(true);
        });
    });

    describe('WorkerCommunication Integration', () => {
        it('should integrate worker messages with reactive state', () => {
            const player = new KokoroPlayer(
                'chunk-container',
                () => {},
                () => {},
                () => {},
                null,
                null
            );

            player.workerComm.workerReady = true;
            player.workerComm.worker = mockWorker;

            // Initial chunks
            player.workerComm._handleWorkerMessage({ data: { chunks: [
                { text: 'Initial 1', audio: mockBlob },
                { text: 'Initial 2', audio: mockBlob },
            ] } });

            expect(audioCardStore.chunks.get().length).toBe(2);

            // Streaming new chunks
            player.workerComm._handleWorkerMessage({ data: { chunks: [
                { text: 'Streaming 1', audio: mockBlob },
                { text: 'Streaming 2', audio: mockBlob },
            ] } });

            // Should replace chunks (current implementation behavior)
            expect(audioCardStore.chunks.get().length).toBe(2);
            expect(audioCardStore.chunks.get()[0].text).toBe('Streaming 1');

            // Completion message
            player.workerComm._handleWorkerMessage({ data: { status: 'completed' } });

            // Should not affect state
            expect(audioCardStore.chunks.get().length).toBe(2);
        });

        it('should handle worker errors gracefully', () => {
            const player = new KokoroPlayer(
                'chunk-container',
                (msg) => {},
                () => {},
                () => {},
                null,
                null
            );

            player.workerComm.workerReady = true;
            player.workerComm.worker = mockWorker;

            // Simulate error message
            player.workerComm._handleWorkerMessage({ data: { status: 'error', message: 'Test error' } });

            // Should set error state
            expect(player.status).toBe('error');
            expect(audioCardStore.getStatus().get()).toBe('error');

            // Chunks should remain accessible
            expect(audioCardStore.chunks.get()).toEqual([]);
        });
    });

    describe('AudioPlayer Integration', () => {
        it('should integrate audio playback with reactive states', () => {
            const player = new KokoroPlayer(
                'chunk-container',
                () => {},
                () => {},
                () => {},
                null,
                null
            );

            player.workerComm.workerReady = true;
            player.workerComm.worker = mockWorker;

            player.workerComm._handleWorkerMessage({ data: { chunks: [
                { text: 'Chunk 1', audio: mockBlob },
                { text: 'Chunk 2', audio: mockBlob },
            ] } });

            // Simulate audio element creation and playback
            const audio1 = player.chunkRenderer.createAudioElement(
                { text: 'Chunk 1', audio: mockBlob },
                0,
                player.chunkRenderer.audioElementCallback
            );

            expect(audio1).toBeInstanceOf(HTMLAudioElement);
            expect(audio1.src).toBe('blob:fake-url');

            // Simulate play event
            player.chunkRenderer.audioElementCallback('play', 0);
            expect(audioCardStore.cardPlayingStates.get().get(0)).toBe(true);

            // Simulate pause event
            player.chunkRenderer.audioElementCallback('pause', 0);
            expect(audioCardStore.cardPlayingStates.get().get(0)).toBe(false);
        });

        it('should handle audio playback errors', () => {
            const player = new KokoroPlayer(
                'chunk-container',
                () => {},
                () => {},
                () => {},
                null,
                null
            );

            player.workerComm.workerReady = true;
            player.workerComm.worker = mockWorker;

            player.workerComm._handleWorkerMessage({ data: { chunks: [
                { text: 'Chunk 1', audio: mockBlob },
            ] } });

            // Simulate audio element creation
            const audio1 = player.chunkRenderer.createAudioElement(
                { text: 'Chunk 1', audio: mockBlob },
                0,
                player.chunkRenderer.audioElementCallback
            );

            // Simulate error state
            audio1.playbackState = 0;
            player.chunkRenderer.audioElementCallback('pause', 0);

            expect(audioCardStore.cardPlayingStates.get().get(0)).toBe(false);
        });
    });

    describe('AudioCardActions Integration', () => {
        it('should batch multiple state updates correctly', () => {
            const player = new KokoroPlayer(
                'chunk-container',
                () => {},
                () => {},
                () => {},
                null,
                null
            );

            player.workerComm.workerReady = true;
            player.workerComm.worker = mockWorker;

            player.workerComm._handleWorkerMessage({ data: { chunks: [
                { text: 'Chunk 1', audio: mockBlob },
                { text: 'Chunk 2', audio: mockBlob },
            ] } });

            // Simulate a chunk ending and next chunk starting
            player.chunkRenderer.audioElementCallback('ended', 0);
            player.currentChunkIndex = 1;
            player.chunkRenderer.audioElementCallback('play', 1);

            // Verify all states updated atomically
            expect(audioCardStore.getCurrentChunkIndex().get()).toBe(1);
            expect(audioCardStore.cardActiveStates.get().get(1)).toBe(true);
            expect(audioCardStore.cardPlayingStates.get().get(1)).toBe(true);
            expect(audioCardStore.cardActiveStates.get().get(0)).toBe(false);
            expect(audioCardStore.cardPlayingStates.get().get(0)).toBe(false);
        });

        it('should handle invalid indices gracefully', () => {
            const player = new KokoroPlayer(
                'chunk-container',
                () => {},
                () => {},
                () => {},
                null,
                null
            );

            player.workerComm.workerReady = true;
            player.workerComm.worker = mockWorker;

            player.workerComm._handleWorkerMessage({ data: { chunks: [
                { text: 'Chunk 1', audio: mockBlob },
            ] } });

            // Try invalid indices
            player.chunkRenderer.audioElementCallback('play', -1);
            player.chunkRenderer.audioElementCallback('play', 999);

            // Should not crash
            expect(audioCardStore.cardPlayingStates.get().get(-1)).toBe(false);
            expect(audioCardStore.cardPlayingStates.get().get(999)).toBe(false);
        });
    });

    describe('Edge Cases and Stress Tests', () => {
        it('should handle rapid chunk additions and removals', () => {
            const player = new KokoroPlayer(
                'chunk-container',
                () => {},
                () => {},
                () => {},
                null,
                null
            );

            player.workerComm.workerReady = true;
            player.workerComm.worker = mockWorker;

            // Add chunks rapidly
            for (let i = 0; i < 50; i++) {
                player.workerComm._handleWorkerMessage({ data: { chunks: [
                    { text: `Chunk ${i}`, audio: mockBlob },
                ] } });
            }

            // Should have 50 chunks
            expect(audioCardStore.chunks.get().length).toBe(50);
            expect(audioCardStore.chunkCount.get()).toBe(50);

            // Simulate chunk removals
            player.workerComm._handleWorkerMessage({ data: { chunks: [
                { text: 'Remaining 1', audio: mockBlob },
                { text: 'Remaining 2', audio: mockBlob },
            ] } });

            // Should have 2 chunks
            expect(audioCardStore.chunks.get().length).toBe(2);
        });

        it('should handle concurrent state updates', () => {
            const player = new KokoroPlayer(
                'chunk-container',
                () => {},
                () => {},
                () => {},
                null,
                null
            );

            player.workerComm.workerReady = true;
            player.workerComm.worker = mockWorker;

            player.workerComm._handleWorkerMessage({ data: { chunks: [
                { text: 'Chunk 1', audio: mockBlob },
                { text: 'Chunk 2', audio: mockBlob },
            ] } });

            // Simulate concurrent operations
            let concurrentUpdates = 0;
            const originalCallback = player.chunkRenderer.audioElementCallback;

            player.chunkRenderer.audioElementCallback = function(...args) {
                concurrentUpdates++;
                const result = originalCallback.apply(this, args);
                concurrentUpdates--;
                return result;
            };

            // Simulate multiple rapid updates
            for (let i = 0; i < 10; i++) {
                player.chunkRenderer.audioElementCallback('ended', i);
                player.currentChunkIndex = i + 1;
                player.chunkRenderer.audioElementCallback('play', i + 1);
            }

            // Should still be consistent
            expect(audioCardStore.chunks.get().length).toBe(2);
            expect(audioCardStore.chunkCount.get()).toBe(2);
        });

        it('should handle null and undefined values gracefully', () => {
            const player = new KokoroPlayer(
                'chunk-container',
                () => {},
                () => {},
                () => {},
                null,
                null
            );

            player.workerComm.workerReady = true;
            player.workerComm.worker = mockWorker;

            // Simulate null chunk
            player.workerComm._handleWorkerMessage({ data: { chunks: [
                { text: null, audio: mockBlob },
                { text: undefined, audio: mockBlob },
            ] } });

            // Should handle without crashing
            expect(audioCardStore.chunks.get().length).toBe(2);
            expect(audioCardStore.chunks.get()[0].text).toBe(null);
            expect(audioCardStore.chunks.get()[1].text).toBe(undefined);
        });

        it('should handle very large chunk counts', () => {
            const player = new KokoroPlayer(
                'chunk-container',
                () => {},
                () => {},
                () => {},
                null,
                null
            );

            player.workerComm.workerReady = true;
            player.workerComm.worker = mockWorker;

            // Simulate 1000 chunks
            const largeChunks = Array.from({ length: 1000 }, (_, i) => ({
                text: `Chunk ${i}`,
                audio: mockBlob,
            }));

            player.workerComm._handleWorkerMessage({ data: { chunks: largeChunks } });

            // Should handle without crashing
            expect(audioCardStore.chunks.get().length).toBe(1000);
            expect(audioCardStore.chunkCount.get()).toBe(1000);

            // Simulate playing middle chunk
            player.chunkRenderer.audioElementCallback('play', 500);
            expect(audioCardStore.cardPlayingStates.get().get(500)).toBe(true);

            // Simulate ending and moving to next
            player.chunkRenderer.audioElementCallback('ended', 500);
            player.currentChunkIndex = 501;
            player.chunkRenderer.audioElementCallback('play', 501);

            expect(audioCardStore.cardPlayingStates.get().get(500)).toBe(false);
            expect(audioCardStore.cardPlayingStates.get().get(501)).toBe(true);
        });
    });

    describe('Cleanup and Resource Management', () => {
        it('should properly clean up when player is destroyed', () => {
            const player = new KokoroPlayer(
                'chunk-container',
                () => {},
                () => {},
                () => {},
                null,
                null
            );

            player.workerComm.workerReady = true;
            player.workerComm.worker = mockWorker;

            player.workerComm._handleWorkerMessage({ data: { chunks: [
                { text: 'Chunk 1', audio: mockBlob },
            ] } });

            // Simulate some state
            player.chunkRenderer.audioElementCallback('play', 0);

            // Call stop (simulates cleanup)
            player.stop();

            // Verify state is reset
            expect(player.isSpeaking).toBe(false);
            expect(player.status).toBe('ready');
            expect(player.currentChunkIndex).toBe(-1);

            // Audio element should be stopped
            const audioEl = player._getAudioElement(0);
            if (audioEl) {
                expect(audioEl.paused).toBe(true);
            }
        });

        it('should handle multiple player instances correctly', () => {
            const player1 = new KokoroPlayer('container1', () => {}, () => {}, () => {}, null, null);
            const player2 = new KokoroPlayer('container2', () => {}, () => {}, () => {}, null, null);

            // Both should share the same audio card store (singleton)
            expect(player1.audioCardStore).toBe(player2.audioCardStore);

            // But they should have separate chunk renderers
            expect(player1.chunkRenderer).not.toBe(player2.chunkRenderer);

            // Simulate playback in player1
            player1.workerComm.workerReady = true;
            player1.workerComm.worker = mockWorker;
            player1.workerComm._handleWorkerMessage({ data: { chunks: [
                { text: 'Player 1', audio: mockBlob },
            ] } });

            // Player1 should have chunks
            expect(audioCardStore.chunks.get().length).toBe(1);

            // Simulate playback in player2
            player2.workerComm.workerReady = true;
            player2.workerComm.worker = mockWorker;
            player2.workerComm._handleWorkerMessage({ data: { chunks: [
                { text: 'Player 2', audio: mockBlob },
            ] } });

            // Player2 should replace chunks (singleton behavior)
            expect(audioCardStore.chunks.get().length).toBe(1);
            expect(audioCardStore.chunks.get()[0].text).toBe('Player 2');
        });
    });
});
