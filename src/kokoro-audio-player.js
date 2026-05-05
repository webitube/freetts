/**
 * AudioPlayer handles chunk-based audio playback for Kokoro TTS.
 * Each audio chunk is rendered as an independent <audio> element.
 */

/**
 * AudioPlayer manages chunk-based audio playback
 */
export class AudioPlayer {
    /**
     * @param {KokoroPlayer} player - Reference to KokoroPlayer instance
     */
    constructor(player) {
        this.player = player;
        this.audioElements = [];
    }

    /**
     * Register an audio element created externally (by ChunkRenderer)
     * @param {number} chunkIndex - Index of the chunk
     * @param {HTMLAudioElement} audioEl - The audio element
     */
    registerAudioElement(chunkIndex, audioEl) {
        audioEl.addEventListener('ended', () => {
            this.player._onChunkEnded(chunkIndex);
        });
        this.audioElements[chunkIndex] = audioEl;
    }

    /**
     * Create an audio element for a chunk
     * @param {number} chunkIndex - Index of the chunk
     * @param {Blob} audioBlob - Audio blob data
     * @returns {HTMLAudioElement} The created audio element
     */
    createAudioElement(chunkIndex, audioBlob) {
        const url = URL.createObjectURL(audioBlob);
        const audio = new Audio(url);
        audio.addEventListener('ended', () => {
            this.player._onChunkEnded(chunkIndex);
        });
        this.audioElements[chunkIndex] = audio;
        return audio;
    }

    /**
     * Play a specific chunk
     * @param {number} chunkIndex - Index of the chunk to play
     */
    playChunk(chunkIndex) {
        const audio = this.audioElements[chunkIndex];
        if (audio) {
            audio.play().catch(err => {
                console.warn('Playback failed:', err);
                this.player._onChunkEnded(chunkIndex);
            });
        }
    }

    /**
     * Stop all audio playback
     */
    stopAll() {
        this.audioElements.forEach(audio => {
            if (audio) {
                audio.pause();
                audio.currentTime = 0;
            }
        });
    }

    /**
     * Clean up audio elements
     */
    cleanup() {
        this.audioElements.forEach(audio => {
            if (audio) {
                URL.revokeObjectURL(audio.src);
                audio.pause();
            }
        });
        this.audioElements = [];
    }
}
