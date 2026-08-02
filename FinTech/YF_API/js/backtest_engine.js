// backtest_engine.js – UI glue for back‑test page

document.addEventListener('DOMContentLoaded', () => {
  const tickerInput = document.getElementById('ticker-input');
  const startDate = document.getElementById('start-date');
  const endDate = document.getElementById('end-date');
  const intervalSelect = document.getElementById('interval-select');
  const strategyCode = document.getElementById('strategy-code');
  const runBtn = document.getElementById('run-backtest');
  const resultsSection = document.getElementById('results-section');
  const chartContainer = document.getElementById('chart-container');
  const metricsOutput = document.getElementById('metrics-output');
  const loader = document.getElementById('loader'); // reuse loader if present

  runBtn.addEventListener('click', () => {
    const ticker = tickerInput.value.trim().toUpperCase();
    const start = startDate.value;
    const end = endDate.value;
    const interval = intervalSelect.value;
    const strategy = strategyCode.value;

    if (!ticker || !start || !end) {
      alert('Please fill ticker and date range');
      return;
    }

    // Show loading
    if (loader) loader.classList.remove('hidden');
    resultsSection.classList.add('hidden');

    const worker = new Worker('./js/backtest_worker.js');
    worker.postMessage({ ticker, start, end, interval, strategyCode: strategy });
    worker.onmessage = (e) => {
      if (loader) loader.classList.add('hidden');
      const data = e.data;
      if (data.status === 'error') {
        alert('Back‑test error: ' + data.message);
        return;
      }
      // Render results
      resultsSection.classList.remove('hidden');
      // Plot candlestick (market data)
      const market = data.marketData.map(d => ({
        x: d.date,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: d.volume,
      }));
      const candleTrace = {
        x: market.map(p => p.x),
        open: market.map(p => p.open),
        high: market.map(p => p.high),
        low: market.map(p => p.low),
        close: market.map(p => p.close),
        type: 'candlestick',
        name: ticker,
      };
      Plotly.newPlot(chartContainer, [candleTrace], {
        title: `${ticker} Candlestick (${interval})`,
        dragmode: 'zoom',
        margin: { t: 40 },
        xaxis: { rangeslider: { visible: false } },
      });

      // Plot equity curve under same container (replace content)
      const equityDiv = document.createElement('div');
      equityDiv.id = 'equity-curve';
      equityDiv.className = 'chart-bg w-full h-96 mt-4';
      chartContainer.appendChild(equityDiv);
      const eqTrace = {
        x: data.equityCurve.map(p => p.date),
        y: data.equityCurve.map(p => p.equity),
        type: 'scatter',
        mode: 'lines',
        name: 'Equity Curve',
        line: { color: '#00ff00' },
      };
      Plotly.newPlot(equityDiv, [eqTrace], { title: 'Equity Curve', margin: { t: 30 } });

      // Metrics output (basic)
      const totalReturn = (data.equityCurve[data.equityCurve.length - 1].equity - 1000).toFixed(2);
      metricsOutput.textContent = `Initial capital: $1000\nFinal equity: $${data.equityCurve[data.equityCurve.length - 1].equity.toFixed(2)}\nTotal return: $${totalReturn}`;
    };
  });
});
