/**
 * data_fetch.js
 * Fetches historical OHLCV data from the backend API and caches results in IndexedDB.
 *
 * API endpoint: GET https://arpan-amp.duckdns.org/api/v1/market-data/{ticker}?period=X&interval=Y
 * Headers: X-API-Key
 * Response: { ticker, currency, history: [{date, open, high, low, close, volume, dividend}] }
 */

const DB_NAME = 'marketPredictionDB';
const STORE_NAME = 'historicalData';
const DB_VERSION = 1;
const BASE_URL = 'https://arpan-amp.duckdns.org/api/v1';

// ─── IndexedDB helpers ──────────────────────────────────────────────────────

function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

function dbGet(key) {
    return openDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(key);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => reject(req.error);
    }));
}

function dbPut(key, value) {
    return openDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    }));
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetches historical OHLCV data with IndexedDB caching.
 * @param {string} ticker  - e.g. "AAPL" or "COALINDIA.NS"
 * @param {string} period  - e.g. "1y", "5y"
 * @param {string} interval - e.g. "1d", "1wk"
 * @param {string} apiKey  - X-API-Key value from localStorage
 * @param {AbortSignal} [signal]
 * @returns {Promise<Array>} array of {date, open, high, low, close, volume, dividend}
 */
export async function fetchHistorical(ticker, period, interval, apiKey, signal) {
    const cacheKey = `${ticker}|${period}|${interval}`;

    // Cache hit: return stored data (skip network)
    const cached = await dbGet(cacheKey);
    if (cached) {
        console.log(`[data_fetch] Cache hit: ${cacheKey}`);
        return cached;
    }

    // Network fetch
    const url = `${BASE_URL}/market-data/${encodeURIComponent(ticker)}?period=${period}&interval=${interval}`;
    const response = await fetch(url, {
        headers: { 'X-API-Key': apiKey },
        signal,
    });

    if (!response.ok) {
        const detail = { 401: 'Invalid API key', 403: 'API key missing', 404: 'Ticker not found' };
        throw new Error(detail[response.status] ?? `HTTP ${response.status}`);
    }

    const json = await response.json();
    const history = json.history ?? [];

    // Persist to cache
    await dbPut(cacheKey, history);
    return history;
}

/**
 * Clear all cached data (useful for forcing fresh fetch).
 */
export async function clearCache() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).clear();
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
    });
}
