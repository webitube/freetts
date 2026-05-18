# Plan to fix test failures

## Context
The project is undergoing a reactive architecture refactor. Recent changes to `ReactiveValue`, `ReactiveStore`, `AudioCardStore`, and `AudioCardActions` have introduced regressions in both unit and integration tests. The primary issues stem from changes in default values, singleton management, and how reactive state is updated and accessed.

## Identified Issues

### 1. `ReactiveValue` Default Value Mismatch
- **Problem**: `ReactiveValue` was changed to default to `null`, but tests expect `undefined`.
- **Files**: `src/reactive-value.js`, `tests/unit/reactive-value.test.js`

### 2. `AudioCardActions` Unregistered Key Access
- **Problem**: Tests call `store.get(key)` directly. Since `ReactiveStore.get(key)` returns `undefined` for unregistered keys, the tests fail when trying to call `.subscribe()` or `.get()` on it.
- **Files**: `tests/unit/audio-card-actions.test.js`

### 3. `AudioCardStore` `chunkCount` Reactivity
- **Problem**: `chunkCount` is not updating when `chunks` change.
- **Files**: `src/audio-card-store.js`, `tests/unit/audio-card-store.test.js`

### 4. `GlobalIntegration` Test Worker Message Simulation
- **Problem**: The integration test simulates worker messages using `_onWorkerMessage` (which was renamed to `_handleWorkerMessage`) but doesn't provide a `status` in the message payload, causing the `switch` in `WorkerCommunication` to do nothing.
- **Files**: `tests/integration/global-integration.test.js`, `src/kokoro-worker-communication.js`

## Proposed Implementation Plan

### Phase 1: Fix `ReactiveValue` and its tests
- Revert `ReactiveValue` constructor to use `undefined` as default to restore compatibility with existing tests, or update all tests to expect `null`. Given the history, `undefined` seems to be the preferred default for "uninitialized".
- Update `tests/unit/reactive-value.test.js` to align with the chosen default.

### Phase 2: Fix `AudioCardActions` tests
- Update tests to use the public API (e.g., `actions.getStatus()`) instead of accessing the store directly via `store.get()`. This ensures that keys are properly registered before use.

### Phase 3: Fix `AudioCardStore` reactivity
- Investigate why the subscription in `AudioCardStore` constructor is not triggering `chunkCount.set()`.
- Ensure `chunks.set()` in `AudioCardActions` is correctly triggering the subscription.

### Phase 4: Fix `GlobalIntegration` test
- Update the simulation in `tests/integration/global-integration.test.js` to include a `status` field in the worker message payload (e.g., `status: 'stream'` or `status: 'complete'`).
- Ensure the `chunks` payload matches what `_handleWorkerMessage` expects.

## Verification Plan
- Run `npm test` after each phase to ensure no regressions.
- Final run of all tests to confirm 100% pass rate.
