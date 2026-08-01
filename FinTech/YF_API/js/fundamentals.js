import { getCurrencySymbol } from './utils.js';

/**
 * Formats large financial integers into standard comma-separated strings.
 */
function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return 'N/A';
    return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Extracts the most recent reporting period column from the Pandas-to-JSON dictionary.
 */
function getLatestColumn(statementObj) {
    if (!statementObj || Object.keys(statementObj).length === 0) return null;
    const keys = Object.keys(statementObj);
    const latestDate = keys[0]; // The backend returns the most recent date first
    return { date: latestDate, data: statementObj[latestDate] };
}

export function updateFundamentalsUI(data) {
    const section = document.getElementById('fundamentals-section');
    const overviewEl = document.getElementById('fund-overview');
    const incomeEl = document.getElementById('fund-income');
    const balanceEl = document.getElementById('fund-balance');

    if (!data || !data.overview) {
        section.classList.add('hidden');
        return;
    }

    const sym = getCurrencySymbol(data.overview.currency);

    // 1. Populate Overview
    overviewEl.innerHTML = `
        <li><span class="text-gray-400 block text-xs uppercase tracking-wider">Sector</span> <span class="font-semibold text-blue-400">${data.overview.sector || 'N/A'}</span></li>
        <li><span class="text-gray-400 block text-xs uppercase tracking-wider">Shares Outstanding</span> <span class="font-mono text-gray-200">${formatNumber(data.overview.shares_outstanding)}</span></li>
        <li><span class="text-gray-400 block text-xs uppercase tracking-wider">Current Price</span> <span class="font-mono text-green-400">${sym}${data.overview.current_price?.toFixed(2) || 'N/A'}</span></li>
    `;

    // 2. Populate Income Statement (Top metrics)
    const income = getLatestColumn(data.income_statement);
    if (income) {
        const keysToShow = ['Total Revenue', 'Gross Profit', 'Operating Income', 'Net Income'];
        let html = `<tr><th colspan="2" class="pb-3 text-blue-400 font-mono text-xs border-b border-gray-600">Reported: ${income.date}</th></tr>`;
        keysToShow.forEach(k => {
            const val = income.data[k];
            html += `<tr><td class="text-gray-400 py-2 pr-4 border-b border-gray-600/50">${k}</td><td class="font-mono text-right border-b border-gray-600/50">${formatNumber(val)}</td></tr>`;
        });
        incomeEl.innerHTML = html;
    } else {
        incomeEl.innerHTML = '<tr><td class="text-gray-500 italic">Financial data not reported</td></tr>';
    }

    // 3. Populate Balance Sheet (Top metrics)
    const balance = getLatestColumn(data.balance_sheet);
    if (balance) {
        const keysToShow = ['Total Assets', 'Total Liabilities Net Minority Interest', 'Total Equity Gross Minority Interest', 'Working Capital'];
        let html = `<tr><th colspan="2" class="pb-3 text-blue-400 font-mono text-xs border-b border-gray-600">Reported: ${balance.date}</th></tr>`;
        keysToShow.forEach(k => {
            const val = balance.data[k];
            // Clean up the verbose Pandas keys for UI
            const displayKey = k.replace('Net Minority Interest', '').replace('Gross Minority Interest', '').trim();
            html += `<tr><td class="text-gray-400 py-2 pr-4 border-b border-gray-600/50">${displayKey}</td><td class="font-mono text-right border-b border-gray-600/50">${formatNumber(val)}</td></tr>`;
        });
        balanceEl.innerHTML = html;
    } else {
        balanceEl.innerHTML = '<tr><td class="text-gray-500 italic">Financial data not reported</td></tr>';
    }

    section.classList.remove('hidden');
}
