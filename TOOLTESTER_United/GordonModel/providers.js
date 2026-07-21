const FinancialProviders = {
    yahoofinance: {
        buildUrl: (ticker, apiKey, start, end) => {
            const period1 = Math.floor(new Date(start).getTime() / 1000);
            const period2 = Math.floor(new Date(end).getTime() / 1000);
            const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${period1}&period2=${period2}&interval=1mo&events=div`;
            return `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
        },
        normalize: (json, start, end) => {
            if (!json.chart || !json.chart.result || !json.chart.result[0].timestamp) {
                throw new Error("No historical data found. Verify Yahoo Finance ticker.");
            }
            const result = json.chart.result[0];
            const timestamps = result.timestamp;
            const quote = result.indicators.quote[0];
            const dividends = result.events && result.events.dividends ? result.events.dividends : {};
            
            const normalized = [];
            for (let i = 0; i < timestamps.length; i++) {
                const dateObj = new Date(timestamps[i] * 1000);
                if (dateObj >= start && dateObj <= end) {
                    const dateStr = dateObj.toISOString().split('T')[0];
                    const currentYearMonth = dateStr.substring(0, 7);
                    const close = quote.close[i];
                    
                    let dividendAmount = 0.00;
                    for (const divKey in dividends) {
                        const divDate = new Date(parseInt(divKey) * 1000).toISOString().substring(0, 7);
                        if (divDate === currentYearMonth) {
                            dividendAmount += dividends[divKey].amount;
                        }
                    }
                    normalized.push({
                        date: currentYearMonth,
                        close: close !== null && close !== undefined ? parseFloat(close) : 0.0,
                        dividend: dividendAmount
                    });
                }
            }
            return normalized;
        }
    },

    arpan_api: {
        buildUrl: (ticker, apiKey, start, end) => {
            // Fetches max available data; filtering occurs in normalize()
            return `https://arpan-amp.duckdns.org/api/v1/market-data/${ticker}?period=max&interval=1mo`;
        },
        buildHeaders: (apiKey) => {
            return {
                'X-API-Key': apiKey,
                'accept': 'application/json'
            };
        },
        normalize: (json, start, end) => {
            if (!json.history) {
                throw new Error("No historical data found or invalid API response.");
            }
            const normalized = [];
            for (const item of json.history) {
                const curDate = new Date(item.date);
                if (curDate >= start && curDate <= end) {
                    normalized.push({
                        date: item.date.substring(0, 7), // Extracts YYYY-MM
                        close: parseFloat(item.close),
                        dividend: item.dividend !== null ? parseFloat(item.dividend) : 0.00
                    });
                }
            }
            return normalized;
        }
    },

    alphavantage: {
        buildUrl: (ticker, apiKey, start, end) => {
            return `https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY_ADJUSTED&symbol=${ticker}&apikey=${apiKey}`;
        },
        normalize: (json, start, end) => {
            const timeSeries = json['Monthly Adjusted Time Series'];
            if (!timeSeries) throw new Error("Invalid API response structure or bad key.");
            
            const normalized = [];
            for (const [dateStr, values] of Object.entries(timeSeries)) {
                const curDate = new Date(dateStr);
                if (curDate >= start && curDate <= end) {
                    normalized.push({
                        date: dateStr.substring(0, 7),
                        close: parseFloat(values['4. close']),
                        dividend: parseFloat(values['7. dividend amount'])
                    });
                }
            }
            return normalized;
        }
    },
    
    fmp: {
        buildUrl: (ticker, apiKey, start, end) => {
            return `https://financialmodelingprep.com/api/v3/historical-price-full/${ticker}?apikey=${apiKey}`;
        },
        normalize: (json, start, end) => {
            const history = json.historical;
            if (!history) throw new Error("No historical data found. Verify FMP key/ticker.");
            
            const monthlyMap = new Map();
            
            history.forEach(day => {
                const curDate = new Date(day.date);
                if (curDate >= start && curDate <= end) {
                    const yearMonth = day.date.substring(0, 7);
                    if (!monthlyMap.has(yearMonth)) {
                        monthlyMap.set(yearMonth, {
                            date: yearMonth,
                            close: parseFloat(day.close),
                            dividend: day.dividend ? parseFloat(day.dividend) : 0.00
                        });
                    }
                }
            });
            return Array.from(monthlyMap.values());
        }
    },

    finnhub: {
        buildUrl: (ticker, apiKey, start, end) => {
            const period1 = Math.floor(new Date(start).getTime() / 1000);
            const period2 = Math.floor(new Date(end).getTime() / 1000);
            return `https://finnhub.io/api/v1/stock/candle?symbol=${ticker}&resolution=M&from=${period1}&to=${period2}&token=${apiKey}`;
        },
        normalize: (json, start, end) => {
            if (json.s !== 'ok' || !json.t) {
                throw new Error("No data returned from Finnhub or invalid API key/ticker.");
            }
            const normalized = [];
            for (let i = 0; i < json.t.length; i++) {
                const dateObj = new Date(json.t[i] * 1000);
                if (dateObj >= start && dateObj <= end) {
                    const dateStr = dateObj.toISOString().split('T')[0];
                    normalized.push({
                        date: dateStr.substring(0, 7),
                        close: parseFloat(json.c[i]),
                        dividend: 0.00
                    });
                }
            }
            return normalized;
        }
    },

    twelvedata: {
        buildUrl: (ticker, apiKey, start, end) => {
            const startStr = start.toISOString().split('T')[0];
            const endStr = end.toISOString().split('T')[0];
            return `https://api.twelvedata.com/time_series?symbol=${ticker}&interval=1month&start_date=${startStr}&end_date=${endStr}&apikey=${apiKey}`;
        },
        normalize: (json, start, end) => {
            if (json.status !== 'ok' || !json.values) {
                throw new Error(json.message || "Invalid Twelve Data API response structure or bad key.");
            }
            const normalized = [];
            for (const item of json.values) {
                const curDate = new Date(item.datetime);
                if (curDate >= start && curDate <= end) {
                    normalized.push({
                        date: item.datetime.substring(0, 7),
                        close: parseFloat(item.close),
                        dividend: 0.00
                    });
                }
            }
            return normalized;
        }
    },

    alpaca: {
        buildUrl: (ticker, apiKey, start, end) => {
            const startStr = start.toISOString();
            const endStr = end.toISOString();
            return `https://data.alpaca.markets/v2/stocks/${ticker}/bars?timeframe=1Month&start=${startStr}&end=${endStr}&feed=iex`;
        },
        buildHeaders: (apiKey) => {
            const keys = apiKey.split(',');
            const keyId = keys[0] ? keys[0].trim() : '';
            const secretKey = keys[1] ? keys[1].trim() : '';
            return {
                'APCA-API-KEY-ID': keyId,
                'APCA-API-SECRET-KEY': secretKey,
                'accept': 'application/json'
            };
        },
        normalize: (json, start, end) => {
            const bars = json.bars;
            if (!bars) {
                throw new Error("No historical data found or invalid Alpaca response.");
            }
            const normalized = [];
            for (const bar of bars) {
                const curDate = new Date(bar.t);
                if (curDate >= start && curDate <= end) {
                    normalized.push({
                        date: bar.t.substring(0, 7),
                        close: parseFloat(bar.c),
                        dividend: 0.00
                    });
                }
            }
            return normalized;
        }
    }
};
