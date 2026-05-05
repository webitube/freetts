/**
 * UIManager handles all DOM manipulation for Kokoro TTS chunk cards
 * and status display.
 */

/**
 * UIManager manages DOM elements for chunk display and status
 */
export class UIManager {
    /**
     * @param {KokoroPlayer} player - Reference to KokoroPlayer instance
     */
    constructor(player) {
        this.player = player;
    }

    /**
     * Set the status message
     * @param {string} message - Status message
     */
    setStatus(message) {
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.textContent = message;
        }
    }

    /**
     * Set error message
     * @param {string} error - Error message
     */
    setError(error) {
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.textContent = `Error: ${error}`;
            statusEl.classList.add('error');
        }
    }

    /**
     * Append a chunk card to the container
     * @param {object} chunk - Chunk data with text
     * @param {number} index - Chunk index
     */
    appendChunkCard(chunk, index) {
        const container = document.getElementById(this.player.containerId);
        if (!container) return;

        const card = document.createElement('div');
        card.className = 'chunk-card';
        card.dataset.index = index;
        card.innerHTML = `
            <div class="chunk-text">${this._escapeHtml(chunk.text)}</div>
            <button class="play-btn" data-index="${index}">▶</button>
        `;

        const playBtn = card.querySelector('.play-btn');
        playBtn.addEventListener('click', () => {
            this.player._handleChunkClick(index);
        });

        container.appendChild(card);
    }

    /**
     * Set a chunk card as active
     * @param {number} index - Chunk index
     * @param {boolean} active - Whether to set active or inactive
     */
    setCardActive(index, active) {
        const container = document.getElementById(this.player.containerId);
        if (!container) return;

        const card = container.querySelector(`[data-index="${index}"]`);
        if (card) {
            card.classList.toggle('active', active);
        }
    }

    /**
     * Set the UI state for speaking/not speaking
     * @param {boolean} isSpeaking - Current speaking state
     */
    setUIState(isSpeaking) {
        this.player._setUIState(isSpeaking);
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
