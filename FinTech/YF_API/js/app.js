import { promptForNewKey, getApiKey } from './auth.js';
import { fetchMarketData, fetchFundamentals } from './api.js';
import { initChart, updateChartData, setSeriesVisibility, setLayoutMargins } from './chart.js';
import { updateFundamentalsUI } from './fundamentals.js'; // NEW

/**
 * Shows a styled toast notification instead of a browser alert().
 * @param {string} message - Text to display
 * @param {'error'|'success'|'info'} type - Visual style
 * @param {number} duration - Auto-dismiss time in ms
 */
function showToast(message, type = 'error', duration = 5000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');

    const colors = {
        error: 'bg-red-600/90 border-red-400',
        success: 'bg-green-600/90 border-green-400',
        info: 'bg-blue-600/90 border-blue-400',
    };

    toast.className = `pointer-events-auto px-5 py-3 rounded-lg border text-sm font-semibold text-white shadow-xl backdrop-blur-sm toast-enter ${colors[type] || colors.info}`;
    toast.textContent = message;

    container.appendChild(toast);

    // Auto-dismiss after duration with a forced fallback
    setTimeout(() => {
        toast.classList.remove('toast-enter');
        toast.classList.add('toast-exit');

        const cleanup = () => toast.remove();
        toast.addEventListener('animationend', cleanup);

        // Safety net: forcefully remove node 500ms after exit triggers,
        // bypassing throttled browser background tabs.
        setTimeout(cleanup, 500);
    }, duration);
}

document.addEventListener('DOMContentLoaded', () => {
    const btnUpdateKey = document.getElementById('btn-update-key');
    const btnFetch = document.getElementById('btn-fetch');
    const inputTicker = document.getElementById('input-ticker');
    const selectPeriod = document.getElementById('select-period');
    const selectInterval = document.getElementById('select-interval');
    const loader = document.getElementById('loader');
    const tickerInfo = document.getElementById('ticker-info');

    let currentAbortController = null; // Declare the controller state

    // Initialize UI and Chart
    initChart('chart-container');
    if (!getApiKey()) { promptForNewKey(); }

    btnUpdateKey.addEventListener('click', () => {
        promptForNewKey();
    });

    // Shared fetch logic
    async function loadChart() {
        const ticker = inputTicker.value.trim().toUpperCase();
        const period = selectPeriod.value;
        const interval = selectInterval.value;

        if (!ticker) {
            showToast('Please enter a valid ticker symbol.', 'error');
            return;
        }

        // 1. Cancel any inflight requests before starting a new one
        if (currentAbortController) {
            currentAbortController.abort();
        }
        
        // 2. Instantiate a fresh controller for this specific request
        currentAbortController = new AbortController();
        const signal = currentAbortController.signal;

        loader.classList.remove('hidden');

        try {
            // 3. Pass the signal to both API calls
            const [marketData, fundData] = await Promise.all([
                fetchMarketData(ticker, period, interval, signal),
                fetchFundamentals(ticker, signal)
            ]);

            // Extract the currency string directly from the backend payload
            updateChartData(marketData.history, ticker, marketData.currency);
            updateFundamentalsUI(fundData);
            
            tickerInfo.classList.remove('hidden');
            showToast(`${ticker} loaded successfully`, 'success', 3000);
            
        } catch (error) {
            // 4. Silently drop the error if it was caused by our intentional abort
            if (error.name === 'AbortError') {
                console.log('Fetch aborted: A newer request superseded this one.');
                return; 
            }
            
            showToast(`Error: ${error.message}`, 'error');
            console.error(error);
        } finally {
            loader.classList.add('hidden');
        }
    }

    // Item 5: Enter key triggers fetch
    inputTicker.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            loadChart();
        }
    });

    // Click handler
    btnFetch.addEventListener('click', loadChart);

    // Overlay Settings logic
    const btnOverlays = document.getElementById('btn-overlays');
    const dropdownOverlays = document.getElementById('dropdown-overlays');
    
    if (btnOverlays && dropdownOverlays) {
        btnOverlays.addEventListener('click', (e) => {
            e.stopPropagation(); // prevent document click from firing immediately
            dropdownOverlays.classList.toggle('hidden');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!dropdownOverlays.contains(e.target)) {
                dropdownOverlays.classList.add('hidden');
            }
        });
    }

    const toggleVol = document.getElementById('toggle-vol');
    const toggleSma20 = document.getElementById('toggle-sma20');
    const toggleSma50 = document.getElementById('toggle-sma50');

    if (toggleVol) toggleVol.addEventListener('change', (e) => setSeriesVisibility('volume', e.target.checked));
    if (toggleSma20) toggleSma20.addEventListener('change', (e) => setSeriesVisibility('sma20', e.target.checked));
    if (toggleSma50) toggleSma50.addEventListener('change', (e) => setSeriesVisibility('sma50', e.target.checked));

    const toggleRsi = document.getElementById('toggle-rsi');
    if (toggleRsi) {
        toggleRsi.addEventListener('change', (e) => setSeriesVisibility('rsi', e.target.checked));
    }

    const sliderMainHeight = document.getElementById('slider-main-height');
    const sliderVolPeak = document.getElementById('slider-vol-peak'); // NEW
    const sliderRsiStart = document.getElementById('slider-rsi-start');

    const valMainHeight = document.getElementById('val-main-height');
    const valVolPeak = document.getElementById('val-vol-peak'); // NEW
    const valRsiStart = document.getElementById('val-rsi-start');

    function handleLayoutChange() {
        let mainHeight = parseInt(sliderMainHeight.value);
        let volPeak = parseInt(sliderVolPeak.value);
        let rsiStart = parseInt(sliderRsiStart.value);

        // Constraint 1: Volume peak cannot go below the RSI start line (minus 5% buffer)
        if (volPeak > rsiStart - 5) {
            volPeak = rsiStart - 5;
            sliderVolPeak.value = volPeak;
        }

        // Constraint 2: Main chart cannot overlap the RSI pane
        if (mainHeight + 5 > rsiStart) {
            rsiStart = mainHeight + 5;
            sliderRsiStart.value = rsiStart;
        }

        // Update UI text
        valMainHeight.textContent = `${mainHeight}%`;
        valVolPeak.textContent = `${volPeak}%`;
        valRsiStart.textContent = `${rsiStart}%`;

        // Push to chart engine
        setLayoutMargins(mainHeight, volPeak, rsiStart);
    }

    if (sliderMainHeight) sliderMainHeight.addEventListener('input', handleLayoutChange);
    if (sliderVolPeak) sliderVolPeak.addEventListener('input', handleLayoutChange); // NEW
    if (sliderRsiStart) sliderRsiStart.addEventListener('input', handleLayoutChange);
});
