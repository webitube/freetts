import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChunkRenderer } from '../../src/kokoro-chunk-renderer.js';

const makeBlob = () => new Blob(['audio data'], { type: 'audio/wav' });

describe('kokoro-chunk-renderer.js', () => {
    let player;
    let chunkRenderer;

    beforeEach(() => {
        player = {
            containerId: 'test-container',
            currentChunkIndex: -1,
            audioPlayer: { registerAudioElement: vi.fn() },
            _onChunkPlay: vi.fn(),
            _onChunkEnded: vi.fn(),
            _updatePlayButton: vi.fn(),
            _isCardPlaying: vi.fn().mockReturnValue(false),
        };
        chunkRenderer = new ChunkRenderer(player);
        document.body.innerHTML = '<div id="test-container"></div>';
    });

    it('creates an audio element with expected attributes for a chunk', () => {
        const chunk = { text: 'Hello', audio: makeBlob() };
        const audioEl = chunkRenderer.createAudioElement(chunk, 0, vi.fn());

        expect(audioEl.tagName).toBe('AUDIO');
        expect(audioEl.id).toBe('audio-chunk-0');
        expect(audioEl.muted).toBe(true);
        expect(audioEl.controls).toBe(true);
        expect(audioEl.preload).toBe('auto');
        expect(audioEl.src).toContain('blob:');
        expect(player.audioPlayer.registerAudioElement).toHaveBeenCalledWith(0, audioEl);
    });

    it('creates a chunk card with a text label and audio child', () => {
        const chunk = { text: 'Test chunk', audio: makeBlob() };
        const card = chunkRenderer.createChunkCard(chunk, 1, vi.fn());

        expect(card.id).toBe('card-1');
        expect(card.children.length).toBe(2);
        expect(card.children[0].tagName).toBe('P');
        expect(card.children[0].textContent).toBe('Test chunk');
        expect(card.children[1].tagName).toBe('AUDIO');
    });
});
