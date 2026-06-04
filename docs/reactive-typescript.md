# ReactiveTypescript

FreeTTS uses [ReactiveTypescript](https://github.com/ReactiveTypescript/ReactiveTypescript) for centralized reactive state management. This document describes how it's used within FreeTTS.

## Overview

ReactiveTypescript provides a decorator-based reactive system for TypeScript classes. It enables properties to automatically notify subscribers when their values change, eliminating the need for manual event dispatching.

## Key Concepts

### ReactiveValue

A single reactive value that notifies subscribers on change:

```typescript
import { ReactiveValue } from '../ReactiveTypescript/src';

const value = new ReactiveValue('initial');
value.subscribe((args) => {
    console.log('Changed to:', args.data);
});
value.set('new value');  // Logs: "Changed to: new value"
```

### ReactiveList

A reactive array that notifies subscribers on add/remove/clear:

```typescript
import { ReactiveList } from '../ReactiveTypescript/src';

const list = new ReactiveList<string>();
list.subscribe((args) => {
    console.log('List changed:', args.data);
});
list.add('item');  // Logs: "List changed: ['item']"
```

### ReactiveDictionary

A reactive key-value map:

```typescript
import { ReactiveDictionary } from '../ReactiveTypescript/src';

const dict = new ReactiveDictionary<string, number>();
dict.subscribe((args) => {
    console.log('Dict changed:', args.data);
});
dict.set('key', 42);
```

### Decorators

Properties are marked as reactive using decorators:

```typescript
import { reactiveValue, reactiveList, reactiveDict, jsonIgnore } from '../ReactiveTypescript/src';

class MyStore {
    @reactiveValue
    count: ReactiveValue<number> = new ReactiveValue(0);

    @reactiveList
    items: ReactiveList<string> = new ReactiveList();

    @reactiveDict
    config: ReactiveDictionary<string, any> = new ReactiveDictionary();

    @jsonIgnore
    private internalState: any = {};  // Excluded from serialization
}
```

### Serialization

Reactive stores can be serialized to JSON and restored:

```typescript
import { ReactiveSerializer, deserializeStore } from '../ReactiveTypescript/src';

// Serialize
const json = ReactiveSerializer.serialize(store);

// Deserialize with silent hydration (no change events)
deserializeStore(store, JSON.parse(json));
```

## Usage in FreeTTS

The `AppStore` singleton uses ReactiveTypescript to manage all application state:

```typescript
import {
    ReactiveValue,
    ReactiveList,
    ReactiveDictionary,
    ReactiveSerializer,
    deserializeStore,
} from '../ReactiveTypescript/src';

import { reactiveValue, reactiveList, reactiveDict } from '../ReactiveTypescript/src';
import { jsonIgnore } from '../ReactiveTypescript/src/decorators/reactive';

class AppStore {
    @reactiveValue
    engine: ReactiveValue<EngineEnum> = new ReactiveValue(EngineEnum.WebSpeech);

    @reactiveValue
    speed: ReactiveValue<number> = new ReactiveValue(1.0);

    @reactiveList
    voices: ReactiveList<VoiceInfo> = new ReactiveList();

    @reactiveDict
    kokoroVoicesMap: ReactiveDictionary<string, KokoroVoiceInfo> = new ReactiveDictionary();

    @jsonIgnore
    private debugLog: string[] = [];

    saveToLocalStorage(): void {
        localStorage.setItem('freetts-settings', this.toJSONString());
    }

    loadFromLocalStorage(): void {
        const json = localStorage.getItem('freetts-settings');
        if (json) this.fromJSON(json);
    }
}
```

## Benefits in FreeTTS

1. **Automatic Synchronization:** All modules subscribe to `AppStore` and react to changes without manual event handling.
2. **Type Safety:** Generics ensure type correctness across all reactive properties.
3. **Silent Hydration:** Loading saved state doesn't trigger change events, preventing unnecessary UI updates.
4. **Clean Serialization:** Decorators mark properties to exclude from serialization (e.g., internal state).
5. **Singleton Pattern:** `AppStore.instance` provides a single access point for all state.

## ReactiveTypescript in FreeTTS Source

The ReactiveTypescript library is included in the project under `ReactiveTypescript/`:

```
ReactiveTypescript/
├── src/
│   ├── index.ts
│   ├── observable.ts
│   ├── reactive.ts
│   ├── reactiveDictionary.ts
│   ├── reactiveHashSet.ts
│   ├── reactiveHydrator.ts
│   ├── reactiveList.ts
│   ├── reactiveSerializer.ts
│   ├── reactiveStoreDeserializer.ts
│   ├── reactiveValue.ts
│   ├── types.ts
│   ├── utils.ts
│   └── decorators/
│       └── reactive.ts
├── test/
│   ├── hydration.test.ts
│   ├── reactiveDictionary.test.ts
│   ├── reactiveHashSet.test.ts
│   ├── reactiveList.test.ts
│   ├── reactiveValue.test.ts
│   ├── serialization.test.ts
│   └── suppressNotifications.test.ts
└── ...
```
