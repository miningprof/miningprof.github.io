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
    }
};
