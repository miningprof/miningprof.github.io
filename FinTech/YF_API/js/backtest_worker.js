/**
 * backtest_worker.js  – runs in a Web Worker (no ES module imports available in all browsers)
 *
 * Message in:  { ticker, period, interval, apiKey, strategyCode }
 * Message out: { status: 'done', marketData, equityCurve, metrics, trades }
 *           or { status: 'error', message }
 */

// ─── Indicator helpers (inline – no importScripts needed) ────────────────────

function calcSMA(data, period) {
    const result = new Array(data.length).fill(null);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
        sum += data[i].close;
        if (i >= period) sum -= data[i - period].close;
        if (i >= period - 1) result[i] = sum / period;
    }
    return result;
}

function calcEMA(data, period) {
    const result = new Array(data.length).fill(null);
    const k = 2 / (period + 1);
    let ema = null;
    for (let i = 0; i < data.length; i++) {
        if (ema === null) {
            ema = data[i].close;
        } else {
            ema = data[i].close * k + ema * (1 - k);
        }
        if (i >= period - 1) result[i] = ema;
    }
    return result;
}

function calcRSI(data, period = 14) {
    const result = new Array(data.length).fill(null);
    if (data.length <= period) return result;
    let avgGain = 0, avgLoss = 0;
    for (let i = 1; i <= period; i++) {
        const d = data[i].close - data[i - 1].close;
        if (d > 0) avgGain += d; else avgLoss -= d;
    }
    avgGain /= period; avgLoss /= period;
    result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    for (let i = period + 1; i < data.length; i++) {
        const d = data[i].close - data[i - 1].close;
        avgGain = (avgGain * (period - 1) + (d > 0 ? d : 0)) / period;
        avgLoss = (avgLoss * (period - 1) + (d < 0 ? -d : 0)) / period;
        result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    }
    return result;
}

// ─── Equity curve & metrics ──────────────────────────────────────────────────

function buildEquityCurve(trades, initialCapital = 10000) {
    let equity = initialCapital;
    const curve = [{ date: trades[0]?.entryDate ?? 'start', equity }];
    for (const t of trades) {
        equity += t.pnl;
        curve.push({ date: t.exitDate, equity });
    }
    return curve;
}

function computeMetrics(trades, equityCurve, initialCapital = 10000) {
    const totalReturn = ((equityCurve[equityCurve.length - 1].equity - initialCapital) / initialCapital * 100).toFixed(2);
    const wins = trades.filter(t => t.pnl > 0).length;
    const losses = trades.filter(t => t.pnl <= 0).length;
    const winRate = trades.length > 0 ? (wins / trades.length * 100).toFixed(1) : 0;

    // Max drawdown
    let peak = initialCapital, maxDD = 0;
    for (const pt of equityCurve) {
        if (pt.equity > peak) peak = pt.equity;
        const dd = (peak - pt.equity) / peak * 100;
        if (dd > maxDD) maxDD = dd;
    }

    return {
        totalTrades: trades.length,
        wins,
        losses,
        winRate: `${winRate}%`,
        totalReturn: `${totalReturn}%`,
        maxDrawdown: `${maxDD.toFixed(2)}%`,
        finalEquity: equityCurve[equityCurve.length - 1].equity.toFixed(2),
        initialCapital,
    };
}

// ─── Fetch historical data (using XMLHttpRequest, compatible with Workers) ────

function fetchData(ticker, period, interval, apiKey) {
    return new Promise((resolve, reject) => {
        const url = `https://arpan-amp.duckdns.org/api/v1/market-data/${encodeURIComponent(ticker)}?period=${period}&interval=${interval}`;
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.setRequestHeader('X-API-Key', apiKey);
        xhr.onload = () => {
            if (xhr.status === 200) {
                try {
                    const json = JSON.parse(xhr.responseText);
                    resolve(json.history ?? []);
                } catch (e) {
                    reject(new Error('Invalid JSON from API'));
                }
            } else {
                const detail = { 401: 'Invalid API key', 403: 'API key missing', 404: 'Ticker not found' };
                reject(new Error(detail[xhr.status] ?? `HTTP ${xhr.status}`));
            }
        };
        xhr.onerror = () => reject(new Error('Network error fetching data'));
        xhr.send();
    });
}

// ─── Message handler ─────────────────────────────────────────────────────────

self.addEventListener('message', async (e) => {
    const { ticker, period, interval, apiKey, strategyCode } = e.data;

    try {
        self.postMessage({ status: 'progress', message: `Fetching ${ticker} (${period}, ${interval})…` });

        const marketData = await fetchData(ticker, period, interval, apiKey);

        if (!marketData || marketData.length === 0) {
            throw new Error('No data returned for this ticker/period combination.');
        }

        // Build indicators object the strategy can use
        const indicators = {
            sma: (p) => calcSMA(marketData, p),
            ema: (p) => calcEMA(marketData, p),
            rsi: (p) => calcRSI(marketData, p),
        };

        // Execute user strategy in a sandboxed Function
        // Strategy should be: function run(data, indicators) { return trades; }
        // Each trade: { entryDate, exitDate, entryPrice, exitPrice, side, shares, pnl }
        let trades = [];
        if (strategyCode && strategyCode.trim()) {
            // eslint-disable-next-line no-new-func
            const userFn = new Function('data', 'indicators',
                `"use strict";\n${strategyCode}\nif(typeof run === 'function') return run(data, indicators);\nreturn [];`
            );
            trades = userFn(marketData, indicators) ?? [];
            if (!Array.isArray(trades)) trades = [];
        }

        self.postMessage({ status: 'progress', message: `Ran strategy, computing results…` });

        const initialCapital = 10000;
        const equityCurve = trades.length > 0
            ? buildEquityCurve(trades, initialCapital)
            : [{ date: marketData[0].date, equity: initialCapital }, { date: marketData[marketData.length - 1].date, equity: initialCapital }];

        const metrics = computeMetrics(trades, equityCurve, initialCapital);

        self.postMessage({ status: 'done', marketData, equityCurve, metrics, trades });

    } catch (err) {
        self.postMessage({ status: 'error', message: err.message });
    }
});
