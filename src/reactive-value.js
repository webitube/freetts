/**
 * ReactiveValue — Observable primitive with encapsulated state
 */
export class ReactiveValue {
    #value;
    #subscribers = new Set();

    constructor(initialValue = undefined) {
        this.#value = initialValue;
    }

    /**
     * Get the current value
     * @returns {*} The current value
     */
    get() {
        return this.#value;
    }

    /**
     * Set a new value and notify all subscribers
     * @param {*} newValue - The new value to set
     */
    set(newValue) {
        if (this.#value !== newValue) {
            const oldValue = this.#value;
            this.#value = newValue;
            this.notify(newValue, oldValue);
        }
    }

    /**
     * Subscribe to value changes
     * @param {Function} callback - Callback function(currentValue, previousValue)
     * @returns {Function} Unsubscribe function
     */
    subscribe(callback) {
        this.#subscribers.add(callback);
        return () => {
            this.#subscribers.delete(callback);
        };
    }

    /**
     * Notify all subscribers of a value change
     * @param {*} current - The new current value
     * @param {*} previous - The previous value
     */
    notify(current, previous) {
        this.#subscribers.forEach(callback => {
            try {
                callback(current, previous);
            } catch (error) {
                console.error('Failed to propagate reactive state update:', error);
            }
        });
    }
}
