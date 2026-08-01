/**
 * Calculates the Simple Moving Average (SMA).
 * @param {Array} data - Sanitized array of historical market data.
 * @param {number} period - The lookback window (e.g., 20 or 50).
 * @returns {Array} Array of { time, value } objects for TradingView.
 */
export function calculateSMA(data, period) {
    const smaData = [];
    
    // We start the loop at 'period - 1' because we need at least 'period' 
    // days of historical data to calculate the first point.
    for (let i = period - 1; i < data.length; i++) {
        let sum = 0;
        for (let j = 0; j < period; j++) {
            sum += data[i - j].close;
        }
        
        smaData.push({
            time: data[i].date,
            value: sum / period
        });
    }
    
    return smaData;
}

/**
 * Calculates the Relative Strength Index (RSI) using Wilder's Smoothing.
 * @param {Array} data - Sanitized array of historical market data.
 * @param {number} period - The lookback window (default is 14).
 * @returns {Array} Array of { time, value } objects for TradingView.
 */
export function calculateRSI(data, period = 14) {
    const rsiData = [];
    if (data.length <= period) return rsiData;

    let avgGain = 0;
    let avgLoss = 0;

    // 1. Calculate the initial Simple Average for the first 'period'
    for (let i = 1; i <= period; i++) {
        const change = data[i].close - data[i - 1].close;
        if (change > 0) avgGain += change;
        else avgLoss -= change;
    }
    avgGain /= period;
    avgLoss /= period;

    let rs = avgLoss === 0 ? 0 : avgGain / avgLoss;
    let rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));

    rsiData.push({ time: data[period].date, value: rsi });

    // 2. Apply Wilder's Smoothing Technique for the rest of the dataset
    for (let i = period + 1; i < data.length; i++) {
        const change = data[i].close - data[i - 1].close;
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? -change : 0;

        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;

        rs = avgLoss === 0 ? 0 : avgGain / avgLoss;
        rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));

        rsiData.push({ time: data[i].date, value: rsi });
    }

    return rsiData;
}
