# DebugLog API

Structured debug logging utilities with optional performance timers.

## Functions

### repeatChar

```typescript
function repeatChar(length: number, char: string): string
```

Creates a string of specified length filled with a given character.

### debugLogArray

```typescript
function debugLogArray(
    title: string,
    msgs: string[],
    timerName?: string
): void
```

Logs an array of messages with formatted header and footer. Optionally measures execution time.

### debugLog

```typescript
function debugLog(msg: string, timerName = ''): void
```

Logs a debug message with optional timer start. Only outputs if debugMode is enabled.

### debugWarn

```typescript
function debugWarn(msg: string, timerName = ''): void
```

Logs a warning message with `!!!` markers.

### debugError

```typescript
function debugError(msg: string, timerName = ''): void
```

Logs an error message with `###` markers.

## Log Level Variants

| Function | Marker | Purpose |
|----------|--------|---------|
| `debugLog` | `>>>` | General debug info |
| `debugWarn` | `!!!` | Warnings |
| `debugError` | `###` | Errors |

## End Variants

Each log function has an `End` variant that prints a footer:
- `debugLogEnd`
- `debugWarnEnd`
- `debugErrorEnd`

## Usage

```typescript
import { debugLog, debugWarn, debugError } from './debug-log';

debugLog('Processing started');
debugWarn('Slow operation detected');
debugError('Failed to load voice');
```

## Debug Mode

All logging is conditional on the global `debugMode` flag from `global-switches.ts`.
