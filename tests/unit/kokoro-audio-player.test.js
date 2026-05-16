import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AudioPlayer } from '../../src/kokoro-audio-player.js';

describe('kokoro-audio-player.js', () => {
    let player;
    let audioPlayer;

    beforeEach(() => {
        player = { _onChunkEnded: vi.fn() };
        audioPlayer = new AudioPlayer(player);
    });

    it('registers audio elements without adding duplicate ended event listeners', () => {
        const mockAudio = { addEventListener: vi.fn() };

        audioPlayer.registerAudioElement(2, mockAudio);

        expect(audioPlayer.audioElements[2]).toBe(mockAudio);
        expect(mockAudio.addEventListener).not.toHaveBeenCalled();
    });
});
