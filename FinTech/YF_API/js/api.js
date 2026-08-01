import { getApiKey } from './auth.js';

const BASE_URL = 'https://arpan-amp.duckdns.org/api/v1';

export async function fetchMarketData(ticker, period = '1d', interval = '1d', signal = null) {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key is missing. Please update your key.");

    // Queries the protected historical data endpoint
    const response = await fetch(`${BASE_URL}/market-data/${ticker}?period=${period}&interval=${interval}`, {
        headers: { 'X-API-Key': apiKey },
        signal: signal // Binds the abort controller
    });

    if (!response.ok) {
        if (response.status === 401) throw new Error("401 Unauthorized: Invalid API key");
        if (response.status === 404) throw new Error("404 Not Found: Ticker unavailable");
        throw new Error(`HTTP Error: ${response.status}`);
    }

    return await response.json();
}

// Append this to the bottom of js/api.js
export async function fetchFundamentals(ticker, signal = null) {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key is missing. Please update your key.");

    const response = await fetch(`${BASE_URL}/fundamentals/${ticker}`, {
        headers: { 'X-API-Key': apiKey },
        signal: signal // Binds the abort controller
    });

    if (!response.ok) {
        if (response.status === 401) throw new Error("401 Unauthorized: Invalid API key");
        if (response.status === 404) throw new Error("404 Not Found: Fundamentals unavailable");
        throw new Error(`HTTP Error: ${response.status}`);
    }

    return await response.json();
}
