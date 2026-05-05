/**
 * ChunkManager handles chunk-based audio generation and playback logic.
 * Manages chunk state, playback sequence, and chunk click handling.
 */

/**
 * ChunkManager manages chunk state and playback logic
 */
export class ChunkManager {
    /**
     * @param {KokoroPlayer} player - Reference to KokoroPlayer instance
     */
    constructor(player) {
        this.player = player;
    }

    /**
     * Start playback from a specific chunk
     * @param {number} chunkIndex - Index of the chunk to start from
     */
    startChunkPlayback(chunkIndex) {
        this.player._startChunkPlayback(chunkIndex);
    }

    /**
     * Handle chunk card click
     * @param {number} chunkIndex - Index of the clicked chunk
     */
    handleChunkClick(chunkIndex) {
        this.player._handleChunkClick(chunkIndex);
    }

    /**
     * Handle chunk playback ending
     * @param {number} chunkIndex - Index of the completed chunk
     */
    onChunkEnded(chunkIndex) {
        this.player._onChunkEnded(chunkIndex);
    }

    /**
     * Check if mobile browser (autoplay restrictions)
     * @returns {boolean}
     */
    isMobileBrowser() {
        return this.player.isMobile;
    }
}
