# GlobalSwitches API

Global configuration flags and accessors for runtime behavior control.

## Functions

### setDebugMode

```typescript
function setDebugMode(debug: boolean): void
```

Enable or disable debug mode globally.

### getDebugMode

```typescript
function getDebugMode(): boolean
```

Get the current debug mode status.

## Usage

```typescript
import { setDebugMode, getDebugMode } from './global-switches';

setDebugMode(true);  // Enable debug logging
const isDebug = getDebugMode();  // Check if debug is enabled
```
