import { calculateSMA, calculateRSI } from './indicators.js';
import { getCurrencySymbol } from './utils.js';

let chart;
let candlestickSeries;
let volumeSeries;
let sma20Series;
let sma50Series;
let rsiSeries; // New declaration

/**
 * Formats a volume number into a human-readable abbreviated string.
 * e.g. 1,230,000,000 → "1.23B", 84,200,000 → "84.2M", 5,230 → "5.23K"
 */
function formatVolume(value) {
    if (value >= 1_000_000_000) {
        return (value / 1_000_000_000).toFixed(2) + 'B';
    } else if (value >= 1_000_000) {
        return (value / 1_000_000).toFixed(2) + 'M';
    } else if (value >= 1_000) {
        return (value / 1_000).toFixed(2) + 'K';
    }
    return value.toFixed(0);
}

export function initChart(containerId) {
    const container = document.getElementById(containerId);
    
    // Instantiate core chart
    chart = LightweightCharts.createChart(container, {
        layout: {
            background: { type: 'solid', color: '#1F2937' }, 
            textColor: '#D1D5DB', 
            attributionLogo: false // REMOVES THE TRADINGVIEW LOGO
        },
        grid: {
            vertLines: { color: '#374151' }, 
            horzLines: { color: '#374151' },
        },
        crosshair: { mode: 0 }, 
        
        // PANE 1: Candlesticks & SMA (Top 60%)
        rightPriceScale: { 
            borderColor: '#4B5563',
            scaleMargins: { top: 0.1, bottom: 0.4 } 
        },
        
        // PANE 2: Volume (65% to 80% mark)
        leftPriceScale: {
            visible: true, 
            borderColor: '#4B5563',
            scaleMargins: { top: 0.65, bottom: 0.2 } 
        },
        
        timeScale: {
            borderColor: '#4B5563',
            timeVisible: true,
        },
    });

    // PANE 3: Initialize a custom scale for RSI (Bottom 15%)
    chart.priceScale('rsi').applyOptions({
        scaleMargins: { top: 0.85, bottom: 0 },
        borderColor: '#4B5563',
        visible: true,
    });

    // Add Candlestick Series with $ formatted price axis
    candlestickSeries = chart.addSeries(LightweightCharts.CandlestickSeries, {
        upColor: '#10B981', 
        downColor: '#EF4444', 
        borderVisible: false,
        wickUpColor: '#10B981',
        wickDownColor: '#EF4444',
        priceFormat: {
            type: 'custom',
            formatter: price => '$' + price.toFixed(2),
        },
    });

    // Add Histogram Series for Volume with abbreviated axis labels
    volumeSeries = chart.addSeries(LightweightCharts.HistogramSeries, {
        color: '#3B82F6',
        priceFormat: {
            type: 'custom',
            formatter: formatVolume,
        },
        priceScaleId: 'left', // BINDS THE VOLUME DATA TO THE VISIBLE LEFT AXIS
    });

    // ADDITION: Initialize SMA Line Series
    sma20Series = chart.addSeries(LightweightCharts.LineSeries, {
        color: '#F59E0B', // Tailwind amber-500
        lineWidth: 2,
        title: 'SMA 20',
        crosshairMarkerVisible: false,
    });

    sma50Series = chart.addSeries(LightweightCharts.LineSeries, {
        color: '#8B5CF6', // Tailwind violet-500
        lineWidth: 2,
        title: 'SMA 50',
        crosshairMarkerVisible: false,
    });

    // Add RSI Series mapping to the custom 'rsi' scale
    rsiSeries = chart.addSeries(LightweightCharts.LineSeries, {
        color: '#EAB308', lineWidth: 2, title: 'RSI 14',
        priceScaleId: 'rsi', crosshairMarkerVisible: false,
    });

    // Generate statutory Overbought/Oversold thresholds
    rsiSeries.createPriceLine({
        price: 70, color: '#EF4444', lineWidth: 1, 
        lineStyle: LightweightCharts.LineStyle.Dashed,
    });
    rsiSeries.createPriceLine({
        price: 30, color: '#10B981', lineWidth: 1, 
        lineStyle: LightweightCharts.LineStyle.Dashed,
    });

    new ResizeObserver(entries => {
        if (entries.length === 0 || entries[0].target !== container) { return; }
        const newRect = entries[0].contentRect;
        chart.applyOptions({ height: newRect.height, width: newRect.width });
    }).observe(container);
}

export function updateChartData(apiHistoryData, tickerSymbol, currencyCode) {
    const sym = getCurrencySymbol(currencyCode);

    if (!apiHistoryData || apiHistoryData.length === 0) return;

    // 1. Sanitize Data First
    const validData = apiHistoryData.filter(row => 
        row.open !== null && row.high !== null && row.low !== null && row.close !== null
    );

    if (validData.length === 0) return;

    // 2. Map core price and volume data
    const candleData = validData.map(row => ({
        time: row.date,
        open: row.open,
        high: row.high,
        low: row.low,
        close: row.close
    }));

    const volumeData = validData.map(row => ({
        time: row.date,
        value: row.volume,
        color: row.close >= row.open ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'
    }));

    // 3. Render core series
    candlestickSeries.setData(candleData);
    volumeSeries.setData(volumeData);
    
    // Update the candlestick price axis formatter
    candlestickSeries.applyOptions({
        priceFormat: {
            type: 'custom',
            formatter: price => sym + price.toFixed(2),
        }
    });
    
    // 4. Calculate and render SMA overlays
    sma20Series.setData(calculateSMA(validData, 20));
    sma50Series.setData(calculateSMA(validData, 50));
    rsiSeries.setData(calculateRSI(validData, 14));

    // Automatically scale viewport to fit the new data
    chart.timeScale().fitContent();

    // Update the ticker info header
    updateTickerInfo(validData, tickerSymbol, sym);
}

/**
 * Populates the ticker info bar above the chart with the latest price,
 * daily change, and daily change percentage.
 */
function updateTickerInfo(history, tickerSymbol, sym) {
    const elSymbol = document.getElementById('info-symbol');
    const elPrice = document.getElementById('info-price');
    const elChange = document.getElementById('info-change');

    if (!elSymbol || !elPrice || !elChange) return;

    // Find the last two valid candles for change calculation
    const validRows = history.filter(r => r.close !== null);
    if (validRows.length === 0) return;

    const latest = validRows[validRows.length - 1];
    const previous = validRows.length >= 2 ? validRows[validRows.length - 2] : null;

    elSymbol.textContent = tickerSymbol;
    elPrice.textContent = sym + latest.close.toFixed(2);

    if (previous) {
        const change = latest.close - previous.close;
        const changePct = (change / previous.close) * 100;
        const sign = change >= 0 ? '+' : '';
        const color = change >= 0 ? '#10B981' : '#EF4444';

        elChange.textContent = `${sign}${change.toFixed(2)} (${sign}${changePct.toFixed(2)}%)`;
        elChange.style.color = color;
    } else {
        elChange.textContent = '';
    }
}

/**
 * Toggles the visibility of a specific series on the chart.
 * @param {string} seriesName - 'volume', 'sma20', or 'sma50'
 * @param {boolean} isVisible - true to show, false to hide
 */
export function setSeriesVisibility(seriesName, isVisible) {
    if (seriesName === 'volume' && volumeSeries) {
        volumeSeries.applyOptions({ visible: isVisible });
    } else if (seriesName === 'sma20' && sma20Series) {
        sma20Series.applyOptions({ visible: isVisible });
    } else if (seriesName === 'sma50' && sma50Series) {
        sma50Series.applyOptions({ visible: isVisible });
    } else if (seriesName === 'rsi' && rsiSeries) {
        rsiSeries.applyOptions({ visible: isVisible });
    }
}

/**
 * Dynamically adjusts the vertical workspace allocated to each axis.
 */
export function setLayoutMargins(mainHeightPct, volPeakPct, rsiStartPct) {
    if (!chart) return;

    // 1. Main Chart (Top to X%)
    const mainBottomMargin = 1.0 - (mainHeightPct / 100); 
    
    // 2. Volume (V% to Y%) - Top margin is now strictly controlled by the Volume Peak slider
    const volTopMargin = volPeakPct / 100;
    const volBottomMargin = 1.0 - ((rsiStartPct - 5) / 100);
    
    // 3. RSI (Y% to Bottom)
    const rsiTopMargin = rsiStartPct / 100;

    // Apply the real-time geometry updates to the respective scales
    chart.priceScale('right').applyOptions({
        scaleMargins: { top: 0.1, bottom: mainBottomMargin }
    });
    
    chart.priceScale('left').applyOptions({
        scaleMargins: { top: volTopMargin, bottom: volBottomMargin }
    });
    
    chart.priceScale('rsi').applyOptions({
        scaleMargins: { top: rsiTopMargin, bottom: 0 }
    });
}
