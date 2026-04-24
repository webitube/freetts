import { debug, debugLog, debugShowArrayBuffer } from './config.js';

class ModelCache {
    constructor() {
        this.dbName = 'kitten-tts-cache';
        this.storeName = 'models';
        this.version = 1;
        this.db = null;
    }

    async init() {
        if (this.db) return this.db;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => { this.db = request.result; resolve(this.db); };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const storeName = this.storeName;
                    const store = db.createObjectStore(storeName, { keyPath: 'url' });
                    debugLog(`storeName=${storeName}`, "ModelCache.init()")
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    async get(url) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(url);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const result = request.result;
                if (result) {
                    const maxAge = 7 * 24 * 60 * 60 * 1000;
                    if (Date.now() - result.timestamp < maxAge) {
                        resolve(result.data);
                        return;
                    }
                    this.delete(url);
                }
                resolve(null);
            };
        });
    }

    async set(url, data) {
        debugLog(`url=${url}, data.byteLength=${data.byteLength}`, "model-cache.set()");
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.put({ url, data, timestamp: Date.now() });
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    async delete(url) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(url);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }
}

export async function cachedFetch(url) {
    const fnName = "cachedFetch";
    debugLog(`debugTts=${debug}`, fnName);
    const cache = new ModelCache();
    debugLog(`1: cachedFetch url: ${url}`, fnName);
    const cachedData = await cache.get(url);
    debugLog(`2: cachedFetch cacheData: ${cachedData}`, fnName);
    if (cachedData)
    {
        debugShowArrayBuffer(cachedData, `${fnName}: ${url}`);
        return new Response(cachedData);
    }
    debugLog(`3: cachedFetch url: ${url}`, fnName);

    const response = await fetch(url);
    debugLog(`4: cachedFetch url: ${url}, response.ok=${response.ok}, status=${response.status}, type=${response.type}, statusText=${response.statusText}, header=${response.headers}`, fnName);

    if (!response.ok)
    {
        debugLog(`5: cachedFetch: FAILED url: ${url}`, fnName);
        throw new Error(`HTTP error ${response.status} fetching ${url}`);
    }

    const data = await response.arrayBuffer();
    await cache.set(url, data);
    return new Response(data, { status: response.status, headers: response.headers });
}

export default ModelCache;
