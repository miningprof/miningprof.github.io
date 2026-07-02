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
                updateStatus(`Successfully loaded ${data.length} records.`, "green");
            } else {
                updateStatus("No data found for this range.", "red");
            }
        } catch (error) {
            console.error(error);
            updateStatus("Failed to fetch data. Check console for details.", "red");
        }
    });

    async function fetchHistoricalData(ticker, start, end) {
        // Convert to Unix timestamps
        const period1 = Math.floor(new Date(start).getTime() / 1000);
        const period2 = Math.floor(new Date(end).getTime() / 1000);
        
        // Yahoo Finance endpoint (monthly data including dividends)
        const targetUrl = `https://query1.finance.yahoo.com/v7/finance/download/${ticker}?period1=${period1}&period2=${period2}&interval=1mo&events=history`;
        
        // Public CORS proxy to bypass browser restrictions
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }
        
        const csvText = await response.text();
        return parseCSV(csvText);
    }

    function parseCSV(csvText) {
        const rows = csvText.split('\n').filter(row => row.trim() !== '');
        if (rows.length < 2) return [];

        const headers = rows[0].split(',');
        
        return rows.slice(1).map(row => {
            const values = row.split(',');
            let rowObj = {};
            headers.forEach((header, index) => {
                // Check if value exists before trimming
                rowObj[header.trim()] = values[index] ? values[index].trim() : "N/A";
            });
            return rowObj;
        });
    }

    function renderTable(data) {
        // 1. Generate Headers dynamically from the first object's keys
        const headers = Object.keys(data[0]);
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            tableHeaders.appendChild(th);
        });

        // 2. Generate Rows
        data.forEach(rowData => {
            const tr = document.createElement('tr');
            headers.forEach(header => {
                const td = document.createElement('td');
                // Format numbers to 2 decimal places if they are valid numbers
                const val = rowData[header];
                if (!isNaN(val) && val !== "N/A" && header !== "Date") {
                    td.textContent = parseFloat(val).toFixed(2);
                } else {
                    td.textContent = val;
                }
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
