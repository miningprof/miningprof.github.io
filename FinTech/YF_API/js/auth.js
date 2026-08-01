const STORAGE_KEY = 'market_api_key';

export function getApiKey() {
    return localStorage.getItem(STORAGE_KEY);
}

export function setApiKey(key) {
    localStorage.setItem(STORAGE_KEY, key);
}

export function promptForNewKey() {
    const currentKey = getApiKey() || '';
    const newKey = prompt('Enter your API Key for arpan-amp.duckdns.org:', currentKey);
    
    if (newKey !== null && newKey.trim() !== '') {
        setApiKey(newKey.trim());
        return true;
    }
    return false;
}
