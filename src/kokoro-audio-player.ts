/**
 * AudioPlayer handles chunk-based audio playback for Kokoro TTS.
 *
 * Manages the lifecycle of `<audio>` elements created for each Kokoro chunk,
 * including registration, playback, pausing, and cleanup of object URLs.
 *
 * @example
 * ```ts
 * const player = new AudioPlayer(kokoroPlayer);
 * const audio = player.createAudioElement(0, audioBlob);
 * player.playChunk(0);
 * player.stopAll();
 * player.cleanup();
 * ```
 */
import { debugLog } from './debug-log';

/**
 * Manages `<audio>` element lifecycle for Kokoro TTS chunk playback.
 */
export class AudioPlayer {
    private player: any;

    /** Array of registered audio elements, indexed by chunk index. */
    audioElements: HTMLAudioElement[] = [];

    /**
     * Create a new AudioPlayer bound to a KokoroPlayer instance.
     * @param player - The parent KokoroPlayer instance.
     */
    constructor(player: any) {
        this.player = player;
    }

    /**
     * Register an existing audio element at the given chunk index.
     * @param chunkIndex - The chunk index to associate with the element.
     * @param audioEl - The HTMLAudioElement to register.
     */
    registerAudioElement(chunkIndex: number, audioEl: HTMLAudioElement): void {
        this.audioElements[chunkIndex] = audioEl;
    }

    /**
     * Create a new HTMLAudioElement from an audio Blob and register it.
     * @param chunkIndex - The chunk index to associate with the element.
     * @param audioBlob - The audio Blob (WAV format).
     * @returns The created HTMLAudioElement.
     */
    createAudioElement(chunkIndex: number, audioBlob: Blob): HTMLAudioElement {
        const url = URL.createObjectURL(audioBlob);
        const audio = new Audio(url);
        this.audioElements[chunkIndex] = audio;
        return audio;
    }

    /**
     * Play the audio chunk at the given index.
     * On failure, delegates to `player._onChunkEnded()`.
     * @param chunkIndex - The chunk index to play.
     */
    playChunk(chunkIndex: number): void {
        const audio = this.audioElements[chunkIndex];
        if (audio) {
            debugLog(`kokoro-audio-player.playChunk(): Playing chunk ${chunkIndex}`);
            audio.play().catch(err => {
                console.warn('Playback failed:', err);
                this.player._onChunkEnded(chunkIndex);
            });
        }
    }

    /**
     * Pause all registered audio elements and reset their playback position.
     */
    stopAll(): void {
        this.audioElements.forEach(audio => {
            if (audio) {
                audio.pause();
                audio.currentTime = 0;
            }
        });
    }

    /**
     * Clean up all registered audio elements: revoke object URLs, pause playback,
     * and clear the internal array.
     */
    cleanup(): void {
        this.audioElements.forEach(audio => {
            if (audio) {
                URL.revokeObjectURL(audio.src);
                audio.pause();
            }
        });
        this.audioElements = [];
    }
}
