document.addEventListener('DOMContentLoaded', () => {
    const fetchBtn = document.getElementById('fetchBtn');
    const statusMessage = document.getElementById('statusMessage');
    const tableHeaders = document.getElementById('tableHeaders');
    const tableBody = document.getElementById('tableBody');

    fetchBtn.addEventListener('click', async () => {
        const ticker = document.getElementById('ticker').value.trim().toUpperCase();
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;

        if (!ticker || !startDate || !endDate) {
            updateStatus("Please fill in all fields.", "red");
            return;
        }

        updateStatus(`Fetching data for ${ticker}...`, "blue");
        clearTable();

        try {
            const data = await fetchHistoricalData(ticker, startDate, endDate);
            if (data && data.length > 0) {
                renderTable(data);
                updateStatus(`Successfully loaded ${data.length} months of records.`, "green");
            } else {
                updateStatus("No data found for this range or ticker.", "red");
            }
        } catch (error) {
            console.error(error);
            updateStatus("Failed to fetch data. Check console for details.", "red");
        }
    });

    async function fetchHistoricalData(ticker, start, end) {
        // Convert dates to Unix timestamps
        const period1 = Math.floor(new Date(start).getTime() / 1000);
        const period2 = Math.floor(new Date(end).getTime() / 1000);
        
        // Use the v8 Chart API (returns JSON) instead of the v7 Download API (returns CSV)
        const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${period1}&period2=${period2}&interval=1mo&events=div`;
        
        // Use AllOrigins proxy for better JSON handling
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;

        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }
        
        const json = await response.json();
        return parseYahooJSON(json);
    }

    function parseYahooJSON(json) {
        // Ensure the data structure is valid before parsing
        if (!json.chart || !json.chart.result || !json.chart.result[0].timestamp) {
            return [];
        }

        const result = json.chart.result[0];
        const timestamps = result.timestamp;
        const quote = result.indicators.quote[0];
        const dividends = result.events && result.events.dividends ? result.events.dividends : {};

        const data = [];
        
        for (let i = 0; i < timestamps.length; i++) {
            // Format Timestamp to YYYY-MM
            const dateObj = new Date(timestamps[i] * 1000);
            const dateStr = dateObj.toISOString().split('T')[0];
            const currentYearMonth = dateStr.substring(0, 7);
            
            const close = quote.close[i];
            
            // Match dividends to the current month
            let dividendAmount = 0.00;
            for (const divKey in dividends) {
                const divDate = new Date(parseInt(divKey) * 1000).toISOString().substring(0, 7);
                if (divDate === currentYearMonth) {
                    dividendAmount += dividends[divKey].amount;
                }
            }

            data.push({
                "Date": currentYearMonth,
                "Close Price": close !== null && close !== undefined ? close.toFixed(2) : "N/A",
                "Dividend Paid": dividendAmount > 0 ? dividendAmount.toFixed(2) : "0.00"
            });
        }
        
        return data;
    }

    function renderTable(data) {
        if (data.length === 0) return;
        const headers = Object.keys(data[0]);
        
        // Generate Headers
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            tableHeaders.appendChild(th);
        });

        // Generate Rows
        data.forEach(rowData => {
            const tr = document.createElement('tr');
            headers.forEach(header => {
                const td = document.createElement('td');
                td.textContent = rowData[header];
                tr.appendChild(td);
            });
            tableBody.appendChild(tr);
        });
    }

    function clearTable() {
        tableHeaders.innerHTML = '';
        tableBody.innerHTML = '';
    }

    function updateStatus(message, color) {
        statusMessage.textContent = message;
        statusMessage.style.color = color;
    }
});
