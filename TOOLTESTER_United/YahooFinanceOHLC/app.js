document.addEventListener('DOMContentLoaded', () => {
    const executeBtn = document.getElementById('executeBtn');
    const providerSelect = document.getElementById('provider');
    const apiKeyInput = document.getElementById('apiKey');
    const statusMessage = document.getElementById('statusMessage');
    const tableHeaders = document.getElementById('tableHeaders');
    const tableBody = document.getElementById('tableBody');

    let convergenceChartInstance = null;

    // Toggle API Key input visibility based on provider selection
    providerSelect.addEventListener('change', () => {
        if (providerSelect.value === 'yahoofinance') {
            apiKeyInput.disabled = true;
            apiKeyInput.placeholder = "Not required for Yahoo Finance";
            apiKeyInput.value = "";
        } else if (providerSelect.value === 'alpaca') {
            apiKeyInput.disabled = false;
            apiKeyInput.placeholder = "Paste Key ID, Secret Key (separated by comma)";
        } else {
            apiKeyInput.disabled = false;
            apiKeyInput.placeholder = "Paste your API Key";
        }
    });

    executeBtn.addEventListener('click', async () => {
        const providerKey = providerSelect.value;
        const apiKey = apiKeyInput.value.trim();
        const ticker = document.getElementById('ticker').value.trim().toUpperCase();
        const startDate = new Date(document.getElementById('startDate').value);
        const endDate = new Date(document.getElementById('endDate').value);
        const r = parseFloat(document.getElementById('reqReturn').value);

        if (providerKey !== 'yahoofinance' && !apiKey) {
            updateStatus("API Key is required for the selected provider.", "error");
            return;
        }
        if (!ticker) {
            updateStatus("Ticker Symbol is required.", "error");
            return;
        }
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            updateStatus("Please specify valid Start and End Dates.", "error");
            return;
        }

        updateStatus(`Querying ${providerKey} orchestration pipeline...`, "info");
        clearDisplay();

        try {
            const provider = FinancialProviders[providerKey];
            const url = provider.buildUrl(ticker, apiKey, startDate, endDate);
            
            const fetchOptions = {};
            if (provider.buildHeaders) {
                fetchOptions.headers = provider.buildHeaders(apiKey);
            }
            
            const response = await fetch(url, fetchOptions);
            if (!response.ok) throw new Error(`Network alert: HTTP ${response.status}`);
            
            const rawJson = await response.json();
            let dataset = provider.normalize(rawJson, startDate, endDate);
            
            // Sort chronologically
            dataset.sort((a, b) => new Date(a.date) - new Date(b.date));

            if (dataset.length === 0) {
                throw new Error("Zero records passed date criteria filters.");
            }

            // Inject Valuation Logic
            const calculatedData = executeValuationModels(dataset, r);
            renderTable(calculatedData);
            updateMetrics(calculatedData);
            renderChart(calculatedData);
            updateStatus(`Execution complete. Processed ${calculatedData.length} timeline points.`, "success");

        } catch (error) {
            console.error(error);
            updateStatus(error.message, "error");
        }
    });

    function executeValuationModels(dataset, r) {
        // Calculate historical base dividend sum to estimate baseline growth rate
        let totalDividends = dataset.reduce((sum, item) => sum + item.dividend, 0);
        
        // Naive rolling proxy implementation for 'g' over window
        // Real-world models derive this from 3-5 yr historical payout trends
        const proxyG = totalDividends > 0 ? 0.045 : 0.00; // Default flat 4.5% or 0% if no dividends

        return dataset.map((item) => {
            const d0 = item.dividend > 0 ? item.dividend : (item.close * 0.015) / 12; // Synthesized yield if monthly zero
            const d1 = d0 * (1 + proxyG);
            
            let intrinsicValue = "N/A";
            let variance = "N/A";

            if (r > proxyG) {
                const calculatedV = (d1 * 12) / (r - proxyG); // Annualized dividend basis
                intrinsicValue = calculatedV.toFixed(2);
                variance = (((calculatedV - item.close) / item.close) * 100).toFixed(1) + "%";
            }

            return {
                "Period": item.date,
                "Market Close": item.close.toFixed(2),
                "Div Paid (Mo)": item.dividend.toFixed(2),
                "Assumed g": (proxyG * 100).toFixed(1) + "%",
                "GGM Value": intrinsicValue,
                "Model Variance": variance
            };
        });
    }

    function renderTable(data) {
        const headers = Object.keys(data[0]);
        headers.forEach(h => {
            const th = document.createElement('th');
            th.textContent = h;
            tableHeaders.appendChild(th);
        });

        data.forEach(row => {
            const tr = document.createElement('tr');
            headers.forEach(h => {
                const td = document.createElement('td');
                td.textContent = row[h];
                tr.appendChild(td);
            });
            tableBody.appendChild(tr);
        });
    }

    function updateMetrics(calculatedData) {
        const prices = calculatedData.map(item => parseFloat(item["Market Close"]));
        const avgClose = prices.reduce((a, b) => a + b, 0) / prices.length;
        
        const totalDiv = calculatedData.reduce((sum, item) => sum + parseFloat(item["Div Paid (Mo)"]), 0);
        
        const gVal = calculatedData[0]["Assumed g"];
        
        const ggmPrices = calculatedData
            .map(item => item["GGM Value"])
            .filter(val => val !== "N/A")
            .map(val => parseFloat(val));
        
        const avgGGM = ggmPrices.length > 0 
            ? (ggmPrices.reduce((a, b) => a + b, 0) / ggmPrices.length).toFixed(2)
            : "N/A";

        document.getElementById('metricAvgClose').textContent = `$${avgClose.toFixed(2)}`;
        document.getElementById('metricTotalDiv').textContent = `$${totalDiv.toFixed(2)}`;
        document.getElementById('metricGrowth').textContent = gVal;
        document.getElementById('metricAvgGGM').textContent = avgGGM !== "N/A" ? `$${avgGGM}` : "N/A";
        
        document.getElementById('metricsGrid').style.display = 'grid';
        document.getElementById('chartCard').style.display = 'block';
        document.getElementById('resultsTableContainer').style.display = 'block';
    }

    function renderChart(calculatedData) {
        const ctx = document.getElementById('convergenceChart').getContext('2d');
        
        if (convergenceChartInstance) {
            convergenceChartInstance.destroy();
        }

        const labels = calculatedData.map(item => item["Period"]);
        const closePrices = calculatedData.map(item => parseFloat(item["Market Close"]));
        const ggmValues = calculatedData.map(item => item["GGM Value"] === "N/A" ? null : parseFloat(item["GGM Value"]));

        // 1. Calculate 3-Period Simple Moving Average (SMA) Overlay
        const smaValues = closePrices.map((val, index, arr) => {
            if (index < 2) return null;
            return (arr[index] + arr[index-1] + arr[index-2]) / 3;
        });

        // 2. Calculate 14-Period Relative Strength Index (RSI) Oscillator
        const rsiValues = new Array(closePrices.length).fill(null);
        if (closePrices.length > 14) {
            let gains = 0, losses = 0;
            for (let i = 1; i <= 14; i++) {
                const diff = closePrices[i] - closePrices[i-1];
                if (diff >= 0) gains += diff; else losses -= diff;
            }
            let avgGain = gains / 14;
            let avgLoss = losses / 14;
            rsiValues[14] = 100 - (100 / (1 + (avgGain / avgLoss)));

            for (let i = 15; i < closePrices.length; i++) {
                const diff = closePrices[i] - closePrices[i-1];
                const gain = diff >= 0 ? diff : 0;
                const loss = diff < 0 ? -diff : 0;
                avgGain = ((avgGain * 13) + gain) / 14;
                avgLoss = ((avgLoss * 13) + loss) / 14;
                rsiValues[i] = avgLoss === 0 ? 100 : 100 - (100 / (1 + (avgGain / avgLoss)));
            }
        }

        convergenceChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Market Close ($)',
                        data: closePrices,
                        borderColor: '#3b82f6',
                        yAxisID: 'y', // Primary Axis
                        tension: 0.3
                    },
                    {
                        label: '3-Period SMA',
                        data: smaValues,
                        borderColor: '#f59e0b',
                        borderDash: [2, 2],
                        yAxisID: 'y', // Primary Axis
                        tension: 0.3
                    },
                    {
                        label: '14-Period RSI',
                        data: rsiValues,
                        borderColor: '#ef4444',
                        yAxisID: 'y1', // Secondary Axis
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                    y: { 
                        type: 'linear', 
                        display: true, 
                        position: 'left',
                        title: { display: true, text: 'Price ($)' }
                    },
                    y1: { 
                        type: 'linear', 
                        display: true, 
                        position: 'right',
                        min: 0,
                        max: 100, // Oscillators are bound 0-100
                        title: { display: true, text: 'RSI Momentum' },
                        grid: { drawOnChartArea: false } // Prevent gridline overlap
                    }
                }
            }
        });
    }

    function clearDisplay() {
        tableHeaders.innerHTML = '';
        tableBody.innerHTML = '';
        document.getElementById('metricsGrid').style.display = 'none';
        document.getElementById('chartCard').style.display = 'none';
        document.getElementById('resultsTableContainer').style.display = 'none';
    }

    function updateStatus(message, type) {
        statusMessage.textContent = message;
        statusMessage.style.display = 'block';
        if (type === 'error') {
            statusMessage.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
            statusMessage.style.border = '1px solid rgba(239, 68, 68, 0.4)';
            statusMessage.style.color = '#fca5a5';
        } else if (type === 'success') {
            statusMessage.style.backgroundColor = 'rgba(16, 185, 129, 0.2)';
            statusMessage.style.border = '1px solid rgba(16, 185, 129, 0.4)';
            statusMessage.style.color = '#a7f3d0';
        } else {
            statusMessage.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
            statusMessage.style.border = '1px solid rgba(59, 130, 246, 0.4)';
            statusMessage.style.color = '#bfdbfe';
        }
    }
});
