/**
 * ChunkManager handles chunk-based audio generation and playback logic.
 *
 * Delegates chunk operations to the parent KokoroPlayer, providing a clean
 * separation of concerns between chunk state management and playback orchestration.
 *
 * @example
 * ```ts
 * const manager = new ChunkManager(kokoroPlayer);
 * manager.startChunkPlayback(0);
 * manager.onChunkEnded(0);
 * ```
 */

/**
 * Delegates chunk state operations to the parent KokoroPlayer.
 */
export class ChunkManager {
    private player: any;

    /**
     * Create a new ChunkManager bound to a KokoroPlayer instance.
     *
     * @param player - The parent KokoroPlayer instance.
     */
    constructor(player: any) {
        this.player = player;
    }

    /**
     * Start playback of the chunk at the given index.
     *
     * @param chunkIndex - The chunk index to begin playing.
     */
    startChunkPlayback(chunkIndex: number): void {
        this.player._startChunkPlayback(chunkIndex);
    }

    /**
     * Handle a user click on a chunk card (seek to that chunk).
     *
     * @param chunkIndex - The chunk index to seek to.
     */
    handleChunkClick(chunkIndex: number): void {
        this.player._handleChunkClick(chunkIndex);
    }

    /**
     * Notify the player that a chunk has finished playing.
     *
     * @param chunkIndex - The chunk index that ended.
     */
    onChunkEnded(chunkIndex: number): void {
        this.player._onChunkEnded(chunkIndex);
    }

    /**
     * Check whether the current browser is a mobile browser.
     *
     * @returns True if running on a mobile device.
     */
    isMobileBrowser(): boolean {
        return this.player.isMobile;
    }
}
