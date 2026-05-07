import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
    repeatChar, 
    debugLog, 
    debugLogEnd, 
    debugWarn, 
    debugWarnEnd, 
    debugError, 
    debugErrorEnd 
} from '../../src/debug-log.js';
import { setDebugMode, getDebugMode } from '../../src/global-switches.js';

describe('debug-log.js', () => {
    let consoleLogSpy;
    let consoleWarnSpy;
    let consoleErrorSpy;
    let consoleTimeSpy;
    let consoleTimeEndSpy;

    beforeEach(() => {
        setDebugMode(true);
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        consoleTimeSpy = vi.spyOn(console, 'time').mockImplementation(() => {});
        consoleTimeEndSpy = vi.spyOn(console, 'timeEnd').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
        consoleWarnSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        consoleTimeSpy.mockRestore();
        consoleTimeEndSpy.mockRestore();
        setDebugMode(false);
    });

    describe('repeatChar', () => {
        it('should repeat a character n times', () => {
            expect(repeatChar(5, '-')).toBe('-----');
            expect(repeatChar(3, '*')).toBe('***');
            expect(repeatChar(0, 'x')).toBe('');
        });

        it('should throw for invalid length', () => {
            expect(() => repeatChar(-1, 'x')).toThrow(RangeError);
            expect(() => repeatChar('abc', 'x')).toThrow(RangeError);
        });
    });

    describe('debugLog', () => {
        it('should log message when debug mode is enabled', () => {
            debugLog('test message');
            expect(consoleLogSpy).toHaveBeenCalledWith('test message');
        });

        it('should not log when debug mode is disabled', () => {
            setDebugMode(false);
            debugLog('test message');
            expect(consoleLogSpy).not.toHaveBeenCalledWith('test message');
        });

        it('should log with timer when timerName provided', () => {
            debugLog('test message', 'myTimer');
            expect(consoleLogSpy).toHaveBeenCalled();
            expect(consoleTimeSpy).toHaveBeenCalledWith('=== myTimer ===');
        });
    });

    describe('debugLogEnd', () => {
        it('should log end message when debug mode is enabled', () => {
            debugLogEnd('test message');
            expect(consoleLogSpy).toHaveBeenCalled();
        });

        it('should not log when debug mode is disabled', () => {
            setDebugMode(false);
            debugLogEnd('test message');
            expect(consoleLogSpy).not.toHaveBeenCalled();
        });

        it('should end timer when timerName provided', () => {
            debugLogEnd('test message', 'myTimer');
            expect(consoleTimeEndSpy).toHaveBeenCalledWith('=== myTimer ===');
        });
    });

    describe('debugWarn', () => {
        it('should warn when debug mode is enabled', () => {
            debugWarn('test warning');
            expect(consoleWarnSpy).toHaveBeenCalledWith('test warning');
        });

        it('should not warn when debug mode is disabled', () => {
            setDebugMode(false);
            debugWarn('test warning');
            expect(consoleWarnSpy).not.toHaveBeenCalled();
        });

        it('should start timer when timerName provided', () => {
            debugWarn('test warning', 'myTimer');
            expect(consoleTimeSpy).toHaveBeenCalledWith('myTimer');
        });
    });

    describe('debugWarnEnd', () => {
        it('should warn with timer end', () => {
            debugWarnEnd('test warning', 'myTimer');
            expect(consoleWarnSpy).toHaveBeenCalledWith('test warning');
            expect(consoleTimeEndSpy).toHaveBeenCalledWith('myTimer');
        });

        it('should not warn when debug mode is disabled', () => {
            setDebugMode(false);
            debugWarnEnd('test warning', 'myTimer');
            expect(consoleWarnSpy).not.toHaveBeenCalled();
        });
    });

    describe('debugError', () => {
        it('should error when debug mode is enabled', () => {
            debugError('test error');
            expect(consoleErrorSpy).toHaveBeenCalledWith('test error');
        });

        it('should not error when debug mode is disabled', () => {
            setDebugMode(false);
            debugError('test error');
            expect(consoleErrorSpy).not.toHaveBeenCalled();
        });

        it('should start timer when timerName provided', () => {
            debugError('test error', 'myTimer');
            expect(consoleTimeSpy).toHaveBeenCalledWith('myTimer');
        });
    });

    describe('debugErrorEnd', () => {
        it('should error with timer end', () => {
            debugErrorEnd('test error', 'myTimer');
            expect(consoleErrorSpy).toHaveBeenCalledWith('test error');
            expect(consoleTimeEndSpy).toHaveBeenCalledWith('myTimer');
        });

        it('should not error when debug mode is disabled', () => {
            setDebugMode(false);
            debugErrorEnd('test error', 'myTimer');
            expect(consoleErrorSpy).not.toHaveBeenCalled();
        });
    });
});