/**
 * GlobalState — Unified global state store for the entire application
 * 
 * This module provides a single, centralized reactive store that combines
 * all application state (audio, settings, UI, etc.) into one coherent system.
 * 
 * Key features:
 * - Singleton pattern ensures single instance across the application
 * - Encapsulated state with private #store field
 * - Automatic state synchronization across all components
 * - Central registry for all app-level reactive values
 * - Graceful fallback for backward compatibility
 */

import { ReactiveStore } from './reactive-store.js';

/**
 * GlobalState — Singleton reactive store for the entire application
 */
export class GlobalState {
    /**
     * Get the singleton instance of the global state
     * @returns {GlobalState} The single GlobalState instance
     */
    static getInstance() {
        if (!GlobalState._instance) {
            GlobalState._instance = new GlobalState();
        }
        return GlobalState._instance;
    }

    /**
     * Get the internal ReactiveStore
     * @returns {ReactiveStore}
     */
    getStore() {
        return this.#store;
    }

    /**
     * Private constructor that initializes the singleton
     */
    constructor() {
        // Initialize the singleton ReactiveStore
        this.#store = new ReactiveStore();
        // Register global app-level state
        this._initializeGlobalState();
    }

    // ─── Private Methods ─────────────────────────────────────────────────

    /**
     * Initialize global state with app-level reactive values
     */
    _initializeGlobalState() {
        // App-wide settings state
        this.settings = this.#store.register('appSettings', {
            theme: 'default',
            language: 'en-US',
            autoPlay: false,
            showControls: true,
        });

        // UI state
        this.uiState = this.#store.register('uiState', {
            isInitialized: false,
            isLoading: false,
            error: null,
        });

        // Navigation state
        this.navigation = this.#store.register('navigation', {
            currentPage: 'home',
            history: [],
        });

        // App lifecycle state
        this.lifecycle = this.#store.register('lifecycle', {
            isReady: false,
            isDestroyed: false,
        });
    }

    /**
     * Get the internal ReactiveStore (private)
     * @private
     * @returns {ReactiveStore}
     */
    get #store() {
        if (GlobalState._instance) {
            return GlobalState._instance._store;
        }
        throw new Error('GlobalState not initialized');
    }

    /**
     * Get the internal ReactiveStore for the singleton
     * @private
     * @returns {ReactiveStore}
     */
    set #store(value) {
        // Constructor only
    }

    // ─── Public API ──────────────────────────────────────────────────────

    /**
     * Register a new reactive value in the global store
     * @param {string} key - Unique identifier
     * @param {*} initialValue - Initial value
     * @returns {ReactiveValue}
     */
    register(key, initialValue = null) {
        return this.#store.register(key, initialValue);
    }

    /**
     * Get a reactive value by key
     * @param {string} key - Unique identifier
     * @returns {ReactiveValue|null}
     */
    get(key) {
        return this.#store.get(key);
    }

    /**
     * Check if a key exists in the global store
     * @param {string} key - Unique identifier
     * @returns {boolean}
     */
    has(key) {
        return this.#store.has(key);
    }

    /**
     * Clear all reactive values (e.g., on page unload)
     */
    clear() {
        this.#store.clear();
    }

    /**
     * Mark the application as ready
     */
    markReady() {
        this.lifecycle.set({ isReady: true });
    }

    /**
     * Mark the application as destroyed
     */
    markDestroyed() {
        this.lifecycle.set({ isDestroyed: true });
    }

    /**
     * Set app-wide settings
     * @param {Object} settings - Settings object to merge
     */
    setSettings(settings) {
        const current = this.settings.get();
        this.settings.set({ ...current, ...settings });
    }

    /**
     * Get app-wide settings
     * @returns {Object}
     */
    getSettings() {
        return this.settings.get();
    }

    /**
     * Set UI state
     * @param {Object} state - UI state object to merge
     */
    setUIState(state) {
        const current = this.uiState.get();
        this.uiState.set({ ...current, ...state });
    }

    /**
     * Get UI state
     * @returns {Object}
     */
    getUIState() {
        return this.uiState.get();
    }

    /**
     * Set navigation state
     * @param {Object} state - Navigation state object to merge
     */
    setNavigation(state) {
        const current = this.navigation.get();
        this.navigation.set({ ...current, ...state });
    }

    /**
     * Get navigation state
     * @returns {Object}
     */
    getNavigation() {
        return this.navigation.get();
    }

    /**
     * Set lifecycle state
     * @param {Object} state - Lifecycle state object to merge
     */
    setLifecycle(state) {
        const current = this.lifecycle.get();
        this.lifecycle.set({ ...current, ...state });
    }

    /**
     * Get lifecycle state
     * @returns {Object}
     */
    getLifecycle() {
        return this.lifecycle.get();
    }
}

// Export singleton instance for convenience
export const globalState = GlobalState.getInstance();