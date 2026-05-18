/**
 * ReactiveStore — Singleton data registry with observable values
 */
import { ReactiveValue } from './reactive-value.js';

export class ReactiveStore {
    static instance = null;
    #registry = new Map();

    constructor() {
        if (ReactiveStore.instance) {
            return ReactiveStore.instance;
        }
        ReactiveStore.instance = this;
    }

    /**
     * Register or retrieve a ReactiveValue by key
     * @param {string} key - Unique identifier
     * @param {*} initialValue - Initial value
     * @returns {ReactiveValue}
     */
    register(key, initialValue = undefined) {
        if (!this.#registry.has(key)) {
            this.#registry.set(key, new ReactiveValue(initialValue));
        }
        return this.#registry.get(key);
    }

    /**
     * Get a ReactiveValue by key
     * @param {string} key - Unique identifier
     * @returns {ReactiveValue|undefined}
     */
    get(key) {
        return this.#registry.get(key);
    }

    /**
     * Check if a key exists in the registry
     * @param {string} key - Unique identifier
     * @returns {boolean}
     */
    has(key) {
        return this.#registry.has(key);
    }

    /**
     * Clear all values (e.g., on page unload)
     */
    clear() {
        this.#registry.clear();
    }
}
