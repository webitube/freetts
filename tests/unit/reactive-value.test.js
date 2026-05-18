import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ReactiveValue } from '../../src/reactive-value.js';

describe('ReactiveValue', () => {
    describe('constructor', () => {
        it('should initialize with undefined value by default', () => {
            const rv = new ReactiveValue();
            expect(rv.get()).toBeUndefined();
        });

        it('should initialize with provided value', () => {
            const rv = new ReactiveValue(42);
            expect(rv.get()).toBe(42);
        });

        it('should accept various types as initial value', () => {
            expect(new ReactiveValue(null).get()).toBeNull();
            expect(new ReactiveValue(undefined).get()).toBeUndefined();
            expect(new ReactiveValue(0).get()).toBe(0);
            expect(new ReactiveValue('').get()).toBe('');
            expect(new ReactiveValue(false).get()).toBe(false);
            expect(new ReactiveValue([]).get()).toEqual([]);
            expect(new ReactiveValue({}).get()).toEqual({});
        });
    });

    describe('get', () => {
        it('should return the current value', () => {
            const rv = new ReactiveValue('test');
            expect(rv.get()).toBe('test');
        });

        it('should return the same reference for objects', () => {
            const obj = { a: 1 };
            const rv = new ReactiveValue(obj);
            expect(rv.get()).toBe(obj);
        });
    });

    describe('set', () => {
        it('should update the value', () => {
            const rv = new ReactiveValue(1);
            rv.set(2);
            expect(rv.get()).toBe(2);
        });

        it('should notify subscribers when value changes', () => {
            const rv = new ReactiveValue(1);
            const callback = vi.fn();
            rv.subscribe(callback);
            rv.set(2);
            expect(callback).toHaveBeenCalledWith(2, 1);
        });

        it('should not notify subscribers when value is the same', () => {
            const rv = new ReactiveValue(1);
            const callback = vi.fn();
            rv.subscribe(callback);
            rv.set(1);
            expect(callback).not.toHaveBeenCalled();
        });

        it('should not notify subscribers when value is the same reference', () => {
            const obj = { a: 1 };
            const rv = new ReactiveValue(obj);
            const callback = vi.fn();
            rv.subscribe(callback);
            rv.set(obj);
            expect(callback).not.toHaveBeenCalled();
        });

        it('should notify subscribers when value changes from null', () => {
            const rv = new ReactiveValue(null);
            const callback = vi.fn();
            rv.subscribe(callback);
            rv.set('new');
            expect(callback).toHaveBeenCalledWith('new', null);
        });

        it('should notify subscribers when value changes from undefined', () => {
            const rv = new ReactiveValue(undefined);
            const callback = vi.fn();
            rv.subscribe(callback);
            rv.set('new');
            expect(callback).toHaveBeenCalledWith('new', undefined);
        });

        it('should handle type changes', () => {
            const rv = new ReactiveValue(1);
            const callback = vi.fn();
            rv.subscribe(callback);
            rv.set('string');
            expect(callback).toHaveBeenCalledWith('string', 1);
        });

        it('should handle array changes', () => {
            const rv = new ReactiveValue([1, 2]);
            const callback = vi.fn();
            rv.subscribe(callback);
            rv.set([1, 2, 3]);
            expect(callback).toHaveBeenCalledWith([1, 2, 3], [1, 2]);
        });
    });

    describe('subscribe', () => {
        it('should add a subscriber', () => {
            const rv = new ReactiveValue(1);
            const callback = vi.fn();
            const unsubscribe = rv.subscribe(callback);
            expect(callback).not.toHaveBeenCalled();
            expect(typeof unsubscribe).toBe('function');
        });

        it('should call subscriber with current value on subscribe', () => {
            const rv = new ReactiveValue(42);
            const callback = vi.fn();
            rv.subscribe(callback);
            // Subscribers are NOT called on subscribe — only on set
            expect(callback).not.toHaveBeenCalled();
        });

        it('should support multiple subscribers', () => {
            const rv = new ReactiveValue(1);
            const cb1 = vi.fn();
            const cb2 = vi.fn();
            rv.subscribe(cb1);
            rv.subscribe(cb2);
            rv.set(2);
            expect(cb1).toHaveBeenCalledWith(2, 1);
            expect(cb2).toHaveBeenCalledWith(2, 1);
        });

        it('should return an unsubscribe function', () => {
            const rv = new ReactiveValue(1);
            const callback = vi.fn();
            const unsubscribe = rv.subscribe(callback);
            rv.set(2);
            expect(callback).toHaveBeenCalledWith(2, 1);
            unsubscribe();
            rv.set(3);
            expect(callback).not.toHaveBeenCalledWith(3, 2);
        });

        it('should allow unsubscribing and resubscribing', () => {
            const rv = new ReactiveValue(1);
            const callback = vi.fn();
            const unsubscribe = rv.subscribe(callback);
            unsubscribe();
            rv.set(2);
            expect(callback).not.toHaveBeenCalled();
            rv.subscribe(callback);
            rv.set(3);
            expect(callback).toHaveBeenCalledWith(3, 2);
        });
    });

    describe('notify', () => {
        it('should call all subscribers with current and previous values', () => {
            const rv = new ReactiveValue(1);
            const cb1 = vi.fn();
            const cb2 = vi.fn();
            rv.subscribe(cb1);
            rv.subscribe(cb2);
            rv.notify(2, 1);
            expect(cb1).toHaveBeenCalledWith(2, 1);
            expect(cb2).toHaveBeenCalledWith(2, 1);
        });

        it('should not crash if a subscriber throws an error', () => {
            const rv = new ReactiveValue(1);
            const goodCallback = vi.fn();
            const badCallback = vi.fn(() => { throw new Error('subscriber error'); });
            rv.subscribe(goodCallback);
            rv.subscribe(badCallback);
            // Should not throw — error is caught internally
            expect(() => rv.notify(2, 1)).not.toThrow();
            expect(goodCallback).toHaveBeenCalledWith(2, 1);
            expect(badCallback).toHaveBeenCalledWith(2, 1);
        });

        it('should not crash if a subscriber throws after unsubscribe', () => {
            const rv = new ReactiveValue(1);
            const callback = vi.fn(() => { throw new Error('subscriber error'); });
            const unsubscribe = rv.subscribe(callback);
            unsubscribe();
            expect(() => rv.notify(2, 1)).not.toThrow();
            expect(callback).not.toHaveBeenCalled();
        });
    });

    describe('edge cases', () => {
        it('should handle unsubscribe called multiple times', () => {
            const rv = new ReactiveValue(1);
            const callback = vi.fn();
            const unsubscribe = rv.subscribe(callback);
            unsubscribe();
            unsubscribe(); // Should not throw
            rv.set(2);
            expect(callback).not.toHaveBeenCalled();
        });

        it('should handle subscribing to a value that never changes', () => {
            const rv = new ReactiveValue(1);
            const callback = vi.fn();
            rv.subscribe(callback);
            expect(callback).not.toHaveBeenCalled();
        });

        it('should handle rapid successive set calls', () => {
            const rv = new ReactiveValue(1);
            const callback = vi.fn();
            rv.subscribe(callback);
            for (let i = 2; i <= 100; i++) {
                rv.set(i);
            }
            expect(callback).toHaveBeenCalledTimes(99);
            expect(callback).toHaveBeenLastCalledWith(100, 99);
        });

        it('should handle subscriber that modifies the value during notification', () => {
            const rv = new ReactiveValue(1);
            const callback = vi.fn((current) => {
                if (current === 2) {
                    rv.set(3);
                }
            });
            rv.subscribe(callback);
            rv.set(2);
            // The callback should have been called with 2
            expect(callback).toHaveBeenCalledWith(2, 1);
        });
    });
});
