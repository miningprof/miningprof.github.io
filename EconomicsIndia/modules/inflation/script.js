// Inflation rates for different categories (hypothetical/approximate for simulation)
// Inflation rates based on MoSPI India data (Jan 2025 / Dec 2024 Provisional)
const CATEGORY_INFLATION = {
    food: 0.07,      // 7.0% - Food (averaged Rural/Urban ~6-8%)
    rent: 0.03,      // 3.0% - Housing (approx 2.8-3%)
    fuel: 0.02,      // 2.0% - Fuel & Light (currently low/volatile)
    education: 0.04, // 4.0% - Education/Health (approx 3.8-4.5%)
    other: 0.045     // 4.5% - Core/Misc
};

let myChart = null;

function calculateInflation() {
    // 1. Get Inputs
    const food = parseFloat(document.getElementById('food').value) || 0;
    const rent = parseFloat(document.getElementById('rent').value) || 0;
    const fuel = parseFloat(document.getElementById('fuel').value) || 0;
    const education = parseFloat(document.getElementById('education').value) || 0;
    const other = parseFloat(document.getElementById('other').value) || 0;

    const totalSpend = food + rent + fuel + education + other;

    if (totalSpend === 0) {
        alert("Please enter some expenses!");
        return;
    }

    // 2. Calculate Weighted Inflation
    // Formula: (Spend * Inflation) / Total Spend
    const weightedFood = (food * CATEGORY_INFLATION.food);
    const weightedRent = (rent * CATEGORY_INFLATION.rent);
    const weightedFuel = (fuel * CATEGORY_INFLATION.fuel);
    const weightedEd = (education * CATEGORY_INFLATION.education);
    const weightedOther = (other * CATEGORY_INFLATION.other);

    const totalWeightedInflation = weightedFood + weightedRent + weightedFuel + weightedEd + weightedOther;
    const personalInflationRate = (totalWeightedInflation / totalSpend) * 100;

    // 3. Display Result Text
    const resultDiv = document.getElementById('resultText');
    resultDiv.innerHTML = `
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 20px;">
            <p><strong>Total Monthly Spend:</strong> ₹${totalSpend.toLocaleString()}</p>
            <p style="font-size: 1.2rem;"><strong>Your Personal Inflation Rate:</strong> <span style="color: #e74c3c; font-size: 1.5rem;">${personalInflationRate.toFixed(2)}%</span></p>
            <p><small>vs Official CPI: ~4.6% (India Combined, Jan '25 Provisional)</small></p>
            <p>This means you will need an extra <strong>₹${Math.round(totalWeightedInflation).toLocaleString()}</strong> next year just to buy the same things.</p>
            
            <hr style="margin: 15px 0; border: 0; border-top: 1px solid #ddd;">
            
            <p style="font-size: 0.9rem;"><strong>What does this mean?</strong><br>
            The official inflation rate (CPI) is an average for the whole country. If your personal rate is higher, it means you spend more on categories that are currently getting expensive (like Food or Education) compared to the "average Indian".</p>
            
            <p style="font-size: 0.8rem; color: #666; margin-top: 10px;">
                <strong>Data Source:</strong><br>
                Based on Consumer Price Index (CPI) data from the <em>Ministry of Statistics and Programme Implementation (MoSPI), Govt of India</em>.<br>
                <em>Reference Period: Jan 2025 (Provisional) & Dec 2024.</em>
            </p>
        </div>
    `;

    // 4. Update Chart
    updateChart(food, rent, fuel, education, other);
}

function updateChart(food, rent, fuel, education, other) {
    const ctx = document.getElementById('inflationChart').getContext('2d');

    if (myChart) {
        myChart.destroy();
    }

    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Food (7%)', 'Rent (3%)', 'Fuel (2%)', 'Education (4%)', 'Other (4.5%)'],
            datasets: [{
                data: [food, rent, fuel, education, other],
                backgroundColor: [
                    '#e74c3c', // Food - Red
                    '#3498db', // Rent - Blue
                    '#2c3e50', // Fuel - Dark
                    '#f1c40f', // Ed - Yellow
                    '#95a5a6'  // Other - Grey
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                },
                title: {
                    display: true,
                    text: 'Your Spending Breakdown'
                }
            }
        }
    });
}

function showOutcome(choice) {
    const outcomeDiv = document.getElementById('policy-outcome');
    let title = "";
    let message = "";
    let color = "";

    switch (choice) {
        case 'ban':
            title = "Outcome: Ban Exports";
            message = "<strong>Short Term:</strong> Domestic supply increases, prices fall to ₹40/kg. Consumers are happy. <br><br><strong>Long Term:</strong> Farmers lose profit and may stop growing onions next year. This could lead to an even bigger shortage later. Plus, India loses credibility as a global exporter.";
            color = "#d4edda"; // Green-ish
            break;
        case 'subsidize':
            title = "Outcome: Subsidize Imports";
            message = "<strong>Short Term:</strong> Government buys onions at ₹100 and sells at ₹50. Prices calm down. <br><br><strong>Long Term:</strong> This increases the Fiscal Deficit (government debt). Money spent here cannot be used for schools or hospitals. Taxpayers eventually pay for it.";
            color = "#fff3cd"; // Yellow-ish
            break;
        case 'nothing':
            title = "Outcome: Do Nothing";
            message = "<strong>Short Term:</strong> Prices remain high. Poor people suffer heavily. Public anger rises. <br><br><strong>Long Term:</strong> High prices signal farmers to grow more onions next season. The market naturally corrects itself, but the immediate human cost is high.";
            color = "#f8d7da"; // Red-ish
            break;
    }

    outcomeDiv.style.display = 'block';
    outcomeDiv.style.backgroundColor = color;
    outcomeDiv.innerHTML = `<h4>${title}</h4><p>${message}</p>`;
}
