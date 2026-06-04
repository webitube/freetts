/**
 * AppStore — Centralized reactive state management for FreeTTS.
 *
 * Singleton store using ReactiveTypescript decorators. All application state
 * (TTS settings, playback, editor, UI, voice) is managed here. Modules subscribe
 * to reactive properties and react to changes automatically.
 *
 * Serialization/hydration via localStorage:
 * - `toJSONString()` / `fromJSON()` for full persistence
 * - Silent hydration: no change events fire during restore
 *
 * @example
 * ```ts
 * // Access the singleton
 * const store = AppStore.instance;
 *
 * // Read/write reactive values
 * store.engine.set(EngineEnum.Kokoro);
 * const current = store.engine.get();
 *
 * // Persist to / restore from localStorage
 * store.saveToLocalStorage();
 * store.loadFromLocalStorage();
 * ```
 */

import {
    ReactiveValue,
    ReactiveList,
    ReactiveDictionary,
    ReactiveSerializer,
    deserializeStore,
} from '../ReactiveTypescript/src';

import {
    reactiveValue,
    reactiveList,
    reactiveDict,
} from '../ReactiveTypescript/src';

import { jsonIgnore } from '../ReactiveTypescript/src/decorators/reactive';

// --- Enums ---

/**
 * Available TTS engine identifiers.
 */
export enum EngineEnum {
    Unknown = 'unknown',
    WebSpeech = 'webspeech',
    Kokoro = 'kokoro',
}

/**
 * Kokoro TTS status states.
 */
export enum StatusEnum {
    Unknown = 'unknown',
    Loading = 'loading',
    Ready = 'ready',
    Generating = 'generating',
    Error = 'error',
}

/**
 * UI theme options.
 */
export enum ThemeEnum {
    Unknown = 'unknown',
    Light = 'light',
    Dark = 'dark',
}

// --- Constants ---

/** localStorage key used for all FreeTTS settings persistence. */
const STORAGE_KEY = 'freetts-settings';

// --- Default Values ---

const DEFAULT_ENGINE = EngineEnum.WebSpeech;
const DEFAULT_SPEED = 1;
const DEFAULT_PITCH = 0;
const DEFAULT_THEME = ThemeEnum.Light;
const DEFAULT_STATUS = StatusEnum.Ready;
const DEFAULT_STATUS_MESSAGE = 'Ready.';

// --- AppStore Class ---

/**
 * Centralized reactive state singleton for the entire FreeTTS application.
 *
 * All reactive properties are decorated with ReactiveTypescript decorators
 * (`@reactiveValue`, `@reactiveList`, `@reactiveDict`). Changes propagate
 * automatically to any subscriber.
 *
 * The store is serialized to `localStorage` under the key `freetts-settings`
 * and can be restored via `loadFromLocalStorage()`.
 */
export class AppStore {
    // --- Singleton ---
    private static _instance: AppStore | null = null;

    /**
     * Get the singleton AppStore instance (lazy initialization).
     *
     * @returns The shared AppStore instance.
     */
    public static get instance(): AppStore {
        if (!this._instance) {
            this._instance = new AppStore();
        }
        return this._instance;
    }

    // --- TTS Settings ---

    /** Current TTS engine. Default: `EngineEnum.WebSpeech`. */
    @reactiveValue()
    public engine = new ReactiveValue<EngineEnum>(DEFAULT_ENGINE);

    /** Playback speed multiplier. Default: `1`. */
    @reactiveValue()
    public speed = new ReactiveValue<number>(DEFAULT_SPEED);

    /** Pitch offset (-2 to +2). Default: `0`. */
    @reactiveValue()
    public pitch = new ReactiveValue<number>(DEFAULT_PITCH);

    /** Per-engine saved voice names (engine → voice name). */
    @reactiveDict()
    public savedVoices = new ReactiveDictionary<string, string>();

    // --- Playback State ---

    /** Whether TTS is currently speaking. */
    @jsonIgnore()
    public isSpeaking = new ReactiveValue<boolean>(false);

    /** Whether playback is intentionally active (toggled by user). */
    @jsonIgnore()
    public isPlaying = new ReactiveValue<boolean>(false);

    /** Kokoro TTS generation status. */
    @reactiveValue()
    public kokoroStatus = new ReactiveValue<StatusEnum>(DEFAULT_STATUS);

    /** Index of the currently playing Kokoro chunk. */
    @reactiveValue()
    public currentChunkIndex = new ReactiveValue<number>(-1);

    // --- Editor State ---

    /** Whether the editor is in Source (Reveal Codes) mode. */
    @jsonIgnore()
    public isSourceMode = new ReactiveValue<boolean>(true);

    /** Current Markdown content. */
    @reactiveValue()
    public currentMarkdown = new ReactiveValue<string>('');

    // --- UI State ---

    /** Current UI theme. Default: `ThemeEnum.Light`. */
    @reactiveValue()
    public theme = new ReactiveValue<ThemeEnum>(DEFAULT_THEME);

    /** Current status message displayed to the user. */
    @reactiveValue()
    public statusMessage = new ReactiveValue<string>(DEFAULT_STATUS_MESSAGE);

    /** Active Kokoro device backend (`'webgpu'` or `'wasm'`). */
    @reactiveValue()
    public activeDevice = new ReactiveValue<string>('');

    // --- Voice State ---

    /** Whether Web Speech voices have been loaded. */
    @reactiveValue()
    public webSpeechVoicesLoaded = new ReactiveValue<boolean>(false);

    /** Whether Kokoro voices have been loaded. */
    @reactiveValue()
    public kokoroVoicesLoaded = new ReactiveValue<boolean>(false);

    /** Loaded Web Speech voice names. */
    @reactiveList()
    public webSpeechVoices = new ReactiveList<string>();

    /** Loaded Kokoro voice entries (key → display name). */
    @reactiveDict()
    public kokoroVoices = new ReactiveDictionary<string, string>();

    // --- Kokoro State ---

    /** Merged WAV blob from the last Kokoro generation (for download). */
    @reactiveValue()
    public kokoroMergedBlob = new ReactiveValue<Blob | null>(null);

    // --- Constructor ---

    /**
     * Private constructor — use `AppStore.instance` to access the singleton.
     * Initializes `savedVoices` with empty defaults for both engines.
     */
    private constructor() {
        // Initialize savedVoices with defaults
        this.savedVoices.set('webspeech', '');
        this.savedVoices.set('kokoro', '');
    }

    // --- Serialization / Hydration ---

    /**
     * Serialize this store to a JSON string.
     * Reactive objects automatically flatten to their raw underlying data.
     *
     * @returns The serialized JSON string.
     */
    public toJSONString(): string {
        return ReactiveSerializer.serialize(this);
    }

    /**
     * Deserialize JSON data into this singleton instance.
     * Uses deserializeStore() which hydrates reactive properties in-place
     * without firing change events (silent hydration).
     *
     * @param json - The JSON string to deserialize.
     * @returns The singleton instance (AppStore.instance).
     */
    public static fromJSON(json: string): AppStore {
        return deserializeStore(json, AppStore);
    }

    // --- localStorage Persistence ---

    /**
     * Save current store state to localStorage.
     */
    public saveToLocalStorage(): void {
        try {
            const json = this.toJSONString();
            localStorage.setItem(STORAGE_KEY, json);
        } catch (e) {
            console.error('Failed to save settings to localStorage:', e);
        }
    }

    /**
     * Load store state from localStorage.
     * Returns true if settings were found and hydrated, false otherwise.
     *
     * @returns True if settings were found and hydrated, false otherwise.
     */
    public loadFromLocalStorage(): boolean {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                AppStore.fromJSON(saved);
                return true;
            }
        } catch (e) {
            console.error('Failed to load settings from localStorage:', e);
        }
        return false;
    }

    /**
     * Check if settings exist in localStorage.
     *
     * @returns True if settings exist, false otherwise.
     */
    public hasSettings(): boolean {
        return localStorage.getItem(STORAGE_KEY) !== null;
    }

    /**
     * Reset store to defaults and clear localStorage.
     */
    public resetToDefaults(): void {
        localStorage.removeItem(STORAGE_KEY);

        this.engine.set(DEFAULT_ENGINE);
        this.speed.set(DEFAULT_SPEED);
        this.pitch.set(DEFAULT_PITCH);
        this.theme.set(DEFAULT_THEME);
        this.statusMessage.set(DEFAULT_STATUS_MESSAGE);
        this.activeDevice.set('');
        this.isSourceMode.set(true);
        this.isSpeaking.set(false);
        this.kokoroStatus.set(DEFAULT_STATUS);
        this.currentChunkIndex.set(-1);
        this.webSpeechVoicesLoaded.set(false);
        this.kokoroVoicesLoaded.set(false);
        this.kokoroMergedBlob.set(null);
        this.webSpeechVoices.clear();
        this.kokoroVoices.clear();
        this.savedVoices.set('webspeech', '');
        this.savedVoices.set('kokoro', '');

        this.saveToLocalStorage();
    }

    // --- Convenience Accessors ---

    /**
     * Get the saved voice for a specific engine.
     * @param engineName - 'webspeech' or 'kokoro'
     * @returns The saved voice name, or empty string if not set.
     */
    public getSavedVoice(engineName: string): string {
        try {
            return this.savedVoices.get(engineName);
        } catch {
            return '';
        }
    }

    /**
     * Set the saved voice for a specific engine.
     * @param engineName - 'webspeech' or 'kokoro'
     * @param voiceName - The voice name to save.
     */
    public setSavedVoice(engineName: string, voiceName: string): void {
        if (voiceName && voiceName !== '') {
            this.savedVoices.set(engineName, voiceName);
        }
    }
}
