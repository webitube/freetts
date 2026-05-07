import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDebugMode, setDebugMode } from '../../src/global-switches.js';

describe('global-switches.js', () => {
    let originalDebugMode;

    beforeEach(() => {
        // Save original state
        originalDebugMode = getDebugMode();
    });

    afterEach(() => {
        // Restore original state
        setDebugMode(originalDebugMode);
    });

    describe('getDebugMode', () => {
        it('should return the current debug mode value', () => {
            setDebugMode(true);
            expect(getDebugMode()).toBe(true);

            setDebugMode(false);
            expect(getDebugMode()).toBe(false);
        });

        it('should default to true', () => {
            // The module initializes debugMode = true
            expect(getDebugMode()).toBe(true);
        });
    });

    describe('setDebugMode', () => {
        it('should set debug mode to true', () => {
            setDebugMode(false);
            setDebugMode(true);
            expect(getDebugMode()).toBe(true);
        });

        it('should set debug mode to false', () => {
            setDebugMode(true);
            setDebugMode(false);
            expect(getDebugMode()).toBe(false);
        });

        it('should handle non-boolean values', () => {
            setDebugMode(1);
            expect(getDebugMode()).toBe(1);

            setDebugMode(0);
            expect(getDebugMode()).toBe(0);

            setDebugMode('true');
            expect(getDebugMode()).toBe('true');
        });
    });
});