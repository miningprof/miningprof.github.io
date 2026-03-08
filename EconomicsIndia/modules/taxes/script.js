function updateBudget() {
    // 1. Get Values
    const infra = parseInt(document.getElementById('infra').value);
    const defense = parseInt(document.getElementById('defense').value);
    const welfare = parseInt(document.getElementById('welfare').value);
    const social = parseInt(document.getElementById('social').value);
    const interest = 30; // Fixed

    // Update spanned values
    document.getElementById('val-infra').innerText = infra;
    document.getElementById('val-defense').innerText = defense;
    document.getElementById('val-welfare').innerText = welfare;
    document.getElementById('val-social').innerText = social;

    // 2. Calculate Total
    const total = infra + defense + welfare + social + interest;
    const statusDiv = document.getElementById('budget-status');

    statusDiv.innerText = `Total Spent: ₹${total} / ₹100`;

    // 3. Validation
    if (total > 100) {
        statusDiv.className = "budget-status status-error";
        statusDiv.innerText += " (OVER BUDGET! Reduce spending)";
        // Disable analysis if over budget? Or just show warning.
        document.getElementById('minister-feedback').innerText = "⚠️ You are spending money you don't have! This will cause high inflation and debt crisis.";
        return;
    } else {
        statusDiv.className = "budget-status status-ok";
    }

    // 4. Calculate Outcomes (Game Logic)
    // Infrastructure: High Growth
    // Defense: Security (Necessary hygiene factor)
    // Welfare: High Happiness, Low Growth
    // Social (Edu/Health): Very High Growth (long term), Medium Happiness

    let growthScore = (infra * 1.5) + (social * 2.0) + (welfare * 0.2) + (defense * 0.5);
    // Normalize growth (Max possible roughly: 50*1.5 + 50*2 + ... but constrained by total 100)
    // Let's say max reasonable allocation to growth sectors gives 100 score.
    // Max Infra(40) + Social(30) = 60 + 60 = 120. 
    // This is simple logic, not exact math.

    let happyScore = (welfare * 2.0) + (social * 1.0) + (infra * 0.5) + (defense * 0.5);

    let securityScore = defense * 4.0; // Needs at least 15 to be safe
    if (defense < 15) securityScore = defense * 1.0; // Penalty for weak defense

    // Scaling to 0-100%
    const growthPercent = Math.min(100, (growthScore / 80) * 100);
    const happyPercent = Math.min(100, (happyScore / 80) * 100);
    const securityPercent = Math.min(100, (securityScore / 60) * 100);

    // 5. Update Meters
    document.getElementById('meter-growth').style.width = growthPercent + "%";
    document.getElementById('meter-happy').style.width = happyPercent + "%";
    document.getElementById('meter-security').style.width = securityPercent + "%";

    // 6. Feedback Generation
    let feedback = "";
    if (total < 90) {
        feedback = "You have unspent money. Why not invest it in Education or Roads?";
    } else if (securityPercent < 50) {
        feedback = "⚠️ National Security is at risk! Enemies might attack. Increase Defense spending.";
    } else if (happyPercent < 40) {
        feedback = "⚠️ The public is very angry. You might lose the next election. Consider more welfare or tax cuts.";
    } else if (growthPercent < 40) {
        feedback = "⚠️ Economy is stagnant. Future generations will be poor. Invest more in Infrastructure and Education.";
    } else {
        feedback = "👏 Balanced Budget! You are managing the trade-offs well.";
    }

    document.getElementById('minister-feedback').innerText = feedback;
}

function showOutcome(choice) {
    const outcomeDiv = document.getElementById('policy-outcome');
    let title = "";
    let message = "";
    let color = "";

    switch (choice) {
        case 'highway':
            title = "Outcome: Build Expressway";
            message = "<strong>Impact:</strong> Creates jobs immediately (construction). Reduces transport costs for businesses, leading to lower prices later. <br><br><strong>Verdict:</strong> Good for long-term growth (Capital Expenditure).";
            color = "#d4edda"; // Green
            break;
        case 'waiver':
            title = "Outcome: Farm Loan Waiver";
            message = "<strong>Impact:</strong> Farmers feel immediate relief. But banks lose money and may stop lending to farmers in future. No new asset is created.<br><br><strong>Verdict:</strong> Bad economics, but often good politics (Revenue Expenditure).";
            color = "#f8d7da"; // Red
            break;
        case 'taxcut':
            title = "Outcome: Cut Income Tax";
            message = "<strong>Impact:</strong> Middle class has more money to spend. Consumption increases, boosting businesses. <br><br><strong>Verdict:</strong> Good for demand, but government has less money for schools and hospitals.";
            color = "#fff3cd"; // Yellow
            break;
    }

    outcomeDiv.style.display = 'block';
    outcomeDiv.style.backgroundColor = color;
    outcomeDiv.innerHTML = `<h4>${title}</h4><p>${message}</p>`;
}

// Init
window.onload = updateBudget;
