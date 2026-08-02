/**
 * auth.js  –  API Key management with a custom HTML modal
 * Stores the key in localStorage. No native window.prompt() used.
 */

const STORAGE_KEY = 'market_api_key';

export function getApiKey() {
    return localStorage.getItem(STORAGE_KEY) || '';
}

export function setApiKey(key) {
    localStorage.setItem(STORAGE_KEY, key.trim());
}

// ─── Build / reuse modal ──────────────────────────────────────────────────────
function ensureModal() {
    if (document.getElementById('api-key-modal')) return;

    document.body.insertAdjacentHTML('beforeend', `
    <div id="api-key-modal"
         style="display:none; position:fixed; inset:0; background:rgba(0,0,0,.65);
                backdrop-filter:blur(4px); z-index:9999;
                justify-content:center; align-items:center;">
        <div style="background:#1f2937; border:1px solid #374151; border-radius:12px;
                    padding:2rem; width:min(420px,90vw); box-shadow:0 20px 60px rgba(0,0,0,.6);">
            <h2 style="margin:0 0 .5rem; font-size:1.1rem; font-weight:700; color:#f3f4f6;">
                🔑 API Key
            </h2>
            <p style="margin:0 0 1.25rem; font-size:.8rem; color:#9ca3af;">
                Enter your backend API key. It is stored only in your browser's
                <code style="color:#60a5fa">localStorage</code> and never sent to any third party.
            </p>
            <input id="api-key-input" type="password"
                   placeholder="Paste your API key here…"
                   autocomplete="off"
                   style="width:100%; padding:.65rem .9rem; border-radius:8px;
                          background:#111827; border:1px solid #4b5563; color:#f3f4f6;
                          font-size:.9rem; margin-bottom:1rem; box-sizing:border-box;" />
            <div style="display:flex; justify-content:flex-end; gap:.75rem;">
                <button id="api-key-cancel"
                    style="padding:.55rem 1.1rem; border-radius:8px; border:1px solid #4b5563;
                           background:transparent; color:#9ca3af; cursor:pointer; font-size:.85rem;">
                    Cancel
                </button>
                <button id="api-key-save"
                    style="padding:.55rem 1.4rem; border-radius:8px; border:none;
                           background:#2563eb; color:#fff; font-weight:600;
                           cursor:pointer; font-size:.85rem;">
                    Save Key
                </button>
            </div>
        </div>
    </div>`);

    const modal  = document.getElementById('api-key-modal');
    const input  = document.getElementById('api-key-input');
    const saveBtn  = document.getElementById('api-key-save');
    const cancelBtn = document.getElementById('api-key-cancel');

    saveBtn.addEventListener('click', () => {
        const val = input.value.trim();
        if (!val) { input.style.borderColor = '#ef4444'; return; }
        setApiKey(val);
        modal.style.display = 'none';
        // Dispatch event so callers know the key was set
        window.dispatchEvent(new CustomEvent('apiKeyUpdated', { detail: val }));
    });

    cancelBtn.addEventListener('click', () => { modal.style.display = 'none'; });

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });

    // Enter key submits
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveBtn.click(); });
}

/**
 * Opens the API key modal (replaces window.prompt).
 * @returns {Promise<string|null>} resolves with the saved key, or null if cancelled.
 */
export function promptForNewKey() {
    ensureModal();
    const modal = document.getElementById('api-key-modal');
    const input = document.getElementById('api-key-input');

    // Pre-fill with current value
    input.value = getApiKey();
    input.style.borderColor = '#4b5563';
    modal.style.display = 'flex';
    setTimeout(() => input.focus(), 80);

    return new Promise((resolve) => {
        const onSaved = (e) => {
            window.removeEventListener('apiKeyUpdated', onSaved);
            resolve(e.detail);
        };
        const onCancel = () => {
            resolve(null);
        };
        window.addEventListener('apiKeyUpdated', onSaved, { once: true });
        document.getElementById('api-key-cancel').addEventListener('click', onCancel, { once: true });
    });
}
