import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ReactiveStore } from '../../src/reactive-store.js';
import { ReactiveValue } from '../../src/reactive-value.js';

describe('ReactiveStore', () => {
    let store;

    beforeEach(() => {
        // Reset singleton before each test
        if (ReactiveStore.instance) {
            ReactiveStore.instance.clear();
        }
        ReactiveStore.instance = null;
        store = new ReactiveStore();
    });

    afterEach(() => {
        // Clean up singleton after each test
        if (ReactiveStore.instance) {
            ReactiveStore.instance.clear();
        }
        ReactiveStore.instance = null;
    });

    describe('singleton pattern', () => {
        it('should return the same instance when created multiple times', () => {
            const store1 = new ReactiveStore();
            const store2 = new ReactiveStore();
            expect(store1).toBe(store2);
        });

        it('should return the same instance across different references', () => {
            const store1 = new ReactiveStore();
            store1.register('test', 1);
            const store2 = new ReactiveStore();
            expect(store2.get('test')).toBe(store1.get('test'));
        });

        it('should not create a new instance if one already exists', () => {
            const store1 = new ReactiveStore();
            const store2 = new ReactiveStore();
            expect(store1).toBe(store2);
        });
    });

    describe('register', () => {
        it('should register a new ReactiveValue', () => {
            const rv = store.register('key1', 'value1');
            expect(rv).toBeInstanceOf(ReactiveValue);
            expect(rv.get()).toBe('value1');
        });

        it('should register with null default value', () => {
            const rv = store.register('key1');
            expect(rv).toBeInstanceOf(ReactiveValue);
            expect(rv.get()).toBeNull();
        });

        it('should return existing ReactiveValue if key already registered', () => {
            const rv1 = store.register('key1', 'value1');
            const rv2 = store.register('key1', 'value2');
            expect(rv1).toBe(rv2);
            expect(rv1.get()).toBe('value1'); // Original value preserved
        });

        it('should register various types as initial values', () => {
            expect(store.register('num', 42).get()).toBe(42);
            expect(store.register('bool', true).get()).toBe(true);
            expect(store.register('str', 'hello').get()).toBe('hello');
            expect(store.register('arr', [1, 2]).get()).toEqual([1, 2]);
            expect(store.register('obj', { a: 1 }).get()).toEqual({ a: 1 });
        });
    });

    describe('get', () => {
        it('should return the ReactiveValue for a registered key', () => {
            store.register('key1', 'value1');
            const rv = store.get('key1');
            expect(rv).toBeInstanceOf(ReactiveValue);
            expect(rv.get()).toBe('value1');
        });

        it('should return undefined for unregistered key', () => {
            expect(store.get('nonexistent')).toBeUndefined();
        });
    });

    describe('has', () => {
        it('should return true for registered key', () => {
            store.register('key1', 'value1');
            expect(store.has('key1')).toBe(true);
        });

        it('should return false for unregistered key', () => {
            expect(store.has('nonexistent')).toBe(false);
        });
    });

    describe('clear', () => {
        it('should remove all registered values', () => {
            store.register('key1', 'value1');
            store.register('key2', 'value2');
            store.clear();
            expect(store.has('key1')).toBe(false);
            expect(store.has('key2')).toBe(false);
        });

        it('should not affect other instances after clear', () => {
            const store1 = new ReactiveStore();
            store1.register('key1', 'value1');
            const store2 = new ReactiveStore();
            store2.register('key2', 'value2');
            store1.clear();
            expect(store1.has('key1')).toBe(false);
            expect(store2.has('key2')).toBe(true);
        });
    });

    describe('reactive integration', () => {
        it('should propagate value changes through ReactiveValue', () => {
            const rv = store.register('key1', 1);
            const callback = vi.fn();
            rv.subscribe(callback);
            rv.set(2);
            expect(callback).toHaveBeenCalledWith(2, 1);
        });

        it('should maintain reactive values after singleton retrieval', () => {
            const store1 = new ReactiveStore();
            const rv1 = store1.register('key1', 1);
            const callback = vi.fn();
            rv1.subscribe(callback);
            
            const store2 = new ReactiveStore();
            const rv2 = store2.get('key1');
            expect(rv1).toBe(rv2);
            
            rv2.set(2);
            expect(callback).toHaveBeenCalledWith(2, 1);
        });
    });
});
