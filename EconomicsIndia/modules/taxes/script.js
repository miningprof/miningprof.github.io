// Diminishing returns helper | ক্রমহ্রাসমান প্রান্তিক উপযোগিতা (Diminishing returns) গণনার সহায়ক ফাংশন (Helper function for calculating diminishing returns)
function logScale(value, multiplier) {
    return value > 0 ? (Math.log10(value + 1) * multiplier * 15) : 0;
}

function updateBudget() {
    // ১. ইনপুট স্লাইডার থেকে কর ও ব্যয়ের মান সংগ্রহ করা হচ্ছে (1. Get Values from input sliders)

    // প্রত্যক্ষ কর (Direct Taxes) - যা সরাসরি ব্যক্তি বা প্রতিষ্ঠান পরিশোধ করে (Taxes paid directly by entity)
    const incomeTax = parseInt(document.getElementById('income-tax').value); // 0 থেকে 30 শতাংশ (0 to 30 percent)
    const corpTax = parseInt(document.getElementById('corp-tax').value); // 10 থেকে 40 শতাংশ (10 to 40 percent)
    const capTax = parseInt(document.getElementById('cap-tax').value); // 0 থেকে 30 শতাংশ (0 to 30 percent)
    const propTax = parseInt(document.getElementById('prop-tax').value); // 0 থেকে 15 শতাংশ (0 to 15 percent)

    // পরোক্ষ কর (Indirect Taxes) - যা পণ্যের মূল্যের সাথে যুক্ত থাকে (Taxes included in product price)
    const gstTax = parseInt(document.getElementById('gst-tax').value); // 5 থেকে 28 শতাংশ (5 to 28 percent)
    const exciseTax = parseInt(document.getElementById('excise-tax').value); // 0 থেকে 40 শতাংশ (0 to 40 percent)
    const customTax = parseInt(document.getElementById('custom-tax').value); // 0 থেকে 30 শতাংশ (0 to 30 percent)

    // সরকারের ঋণ নেওয়ার পরিমাণ (Fiscal Deficit) (Government borrowing amount)
    const borrow = parseInt(document.getElementById('borrow').value); // 0 থেকে 30 (0 to 30)

    // সরকারি ব্যয় খাতসমূহ (Government expenditure sectors)
    const infra = parseInt(document.getElementById('infra').value);
    const defense = parseInt(document.getElementById('defense').value);
    const welfare = parseInt(document.getElementById('welfare').value);
    const social = parseInt(document.getElementById('social').value);
    // ঋণ নিলে সরকারের সুদের বোঝা সামান্য বাড়ে (Borrowing slightly increases government's interest burden)
    const interest = 30 + (borrow * 0.5);

    // ইউজার ইন্টারফেসে (UI) স্প্যান (span) মানগুলো আপডেট করা হচ্ছে (Updating span values in the User Interface)
    document.getElementById('val-income-tax').innerText = incomeTax;
    document.getElementById('val-corp-tax').innerText = corpTax;
    document.getElementById('val-cap-tax').innerText = capTax;
    document.getElementById('val-prop-tax').innerText = propTax;

    document.getElementById('val-gst-tax').innerText = gstTax;
    document.getElementById('val-excise-tax').innerText = exciseTax;
    document.getElementById('val-custom-tax').innerText = customTax;

    document.getElementById('val-borrow').innerText = borrow;
    document.getElementById('val-infra').innerText = infra;
    document.getElementById('val-defense').innerText = defense;
    document.getElementById('val-welfare').innerText = welfare;
    document.getElementById('val-social').innerText = social;

    // ২. মোট রাজস্ব (Revenue) এবং মোট ব্যয়ের (Spent) হিসাব (2. Calculate Total Revenue and Total Expenditure)
    // বেস রেভিনিউ: অনেক কমানো হয়েছে। ১০০ টাকায় পৌঁছানোর জন্য ব্যবহারকারীকে অবশ্যই কর বাড়াতে হবে বা ঋণ নিতে হবে। (Base revenue: Reduced significantly. Must raise taxes or borrow to hit 100)
    const directRevenue = (incomeTax * 1.5) + (corpTax * 2.0) + (capTax * 0.5) + (propTax * 0.2);
    const indirectRevenue = (gstTax * 2.5) + (exciseTax * 1.0) + (customTax * 0.6);
    // রাজস্বকে দুষ্প্রাপ্য (scarce) করার জন্য ১৫ নেতিবাচক মান যোগ করা হয়েছে, যাতে বিনামূল্যে টাকা না পাওয়া যায় (Flat negative 15 added to make revenue scarce; no free money)
    const revenue = directRevenue + indirectRevenue - 15;

    // মোট বাজেট = রাজস্ব (Revenue) + ঋণ (Borrowing) (Total Budget = Revenue + Borrowing)
    const totalBudget = revenue + borrow;

    // মোট খরচ = সকল খাতের খরচের যোগফল (Total Spent = sum of all sector expenditures)
    const totalSpent = infra + defense + welfare + social + interest;

    const statusDiv = document.getElementById('budget-status');
    const outputStatusDiv = document.getElementById('output-budget-status');

    // UI তে বাজেট এবং খরচের অবস্থা দেখানো হচ্ছে (Displaying budget and expenditure status on UI)
    const statusText = `Total Budget: ₹${totalBudget.toFixed(0)} | Spent: ₹${totalSpent.toFixed(0)}`;
    statusDiv.innerText = statusText;
    outputStatusDiv.innerText = statusText;

    // ৩. বৈধতা যাচাই (Validation - ওভার বাজেট কিনা | Check if over budget)
    if (totalSpent > totalBudget) {
        // যদি খরচের পরিমাণ বাজেটের বেশি হয়, তবে লাল ওয়ার্নিং দেখাবে (If expenditure exceeds budget, show red warning)
        statusDiv.className = "budget-status status-error";
        statusDiv.innerText += " (OVER BUDGET! Reduce spending or raise funds)";

        outputStatusDiv.style.backgroundColor = "#e74c3c";
        outputStatusDiv.style.color = "white";
        outputStatusDiv.innerText += " (OVER BUDGET!)";

        document.getElementById('minister-feedback').innerText = "⚠️ You are spending money you don't have! The government will literally run out of cash.";
        return;
    } else {
        // বাজেট ঠিক থাকলে সবুজ দেখাবে (If budget is okay, show green)
        statusDiv.className = "budget-status status-ok";
        outputStatusDiv.style.backgroundColor = "#ecf0f1";
        outputStatusDiv.style.color = "black";
    }

    // ৪. ফলাফল গণনা (উন্নত নন-লিনিয়ার গেম লজিক | 4. Calculate Outcomes with Advanced Non-Linear Game Logic)

    // প্রবৃদ্ধির স্কোর (Growth Score) - পরিকাঠামো এবং সামাজিক খাত বাড়িয়ে দেয় (Infrastructure and social sectors increase Growth Score)
    let growthScore = logScale(infra, 1.5) + logScale(social, 2.0) + (defense * 0.2);
    if (welfare > 30 && infra < 15) {
        growthScore -= (welfare - 30) * 1.5; // পরিকাঠামো ছাড়া বিনামূল্যে সুবিধা দেওয়ার জন্য জরিমানা (Penalty for providing freebies without infrastructure)
    }
    // কর থেকে প্রবৃদ্ধির ওপর জরিমানা (Penalties on growth from taxes)
    if (corpTax > 25) {
        growthScore -= (corpTax - 25) * 1.5; // উচ্চ কর্পোরেট কর ব্যবসার সম্প্রসারণকে ব্যাহত করে (High corporate tax hinders business expansion)
    }
    if (capTax > 20) {
        growthScore -= (capTax - 20) * 1.0; // উচ্চ মূলধনী লাভ কর (Capital gains) স্টার্টআপ ফান্ডিং-এর ক্ষতি করে (High capital gains tax hurts startup funding)
    }
    if (customTax > 15) {
        growthScore -= (customTax - 15) * 0.5; // উচ্চ শুল্ক অদক্ষ ব্যবসাকে রক্ষা করে, যা দীর্ঘমেয়াদে রপ্তানি প্রবৃদ্ধির ক্ষতি করে (High customs protect inefficient businesses, hurting long-term export growth)
    }

    // সুখের স্কোর (Happiness Score) - কল্যাণমূলক কাজ এবং পরিকাঠামো বাড়িয়ে দেয় (Welfare and infrastructure increase Happiness Score)
    let happyScore = logScale(welfare, 2.5) + logScale(social, 1.2) + logScale(infra, 0.8);
    if (growthScore < 30) {
        happyScore -= 15; // স্থবির অর্থনীতি মানুষকে অসুখী করে (A stagnant economy makes people unhappy)
    }
    // কর থেকে সুখের ওপর জরিমানা (Penalties on happiness from taxes)
    if (gstTax > 18) {
        happyScore -= (gstTax - 18) * 3.0; // জিএসটি (GST) রিগ্রেসিভ; এটি দরিদ্রদের সবচেয়ে বেশি এবং দ্রুত ক্ষতি করে (GST is regressive; it disproportionately hurts the poor)
    }
    if (exciseTax > 25) {
        happyScore -= (exciseTax - 25) * 2.0; // জ্বালানি/মদের কর দৈনন্দিন জিনিসপত্রের দাম বাড়িয়ে দেয় (Fuel/liquor tax cascades into expensive daily items)
    }
    if (incomeTax > 15) {
        happyScore -= (incomeTax - 15) * 1.0; // আয়কর কষ্ট দেয়, কিন্তু ভারতের স্ল্যাব সিস্টেমের কারণে সামগ্রিক প্রভাব কিছুটা কম (Income tax hurts, but muted due to India's slab system)
    }
    if (propTax > 10) {
        happyScore -= (propTax - 10) * 0.5; // বাড়ির মালিকরা রাগ করে, তবে সাধারণ জনগণের ওপর এর প্রভাব তুলনামূলক কম (Homeowners get angry, but minor impact on general populace)
    }

    // নিরাপত্তা স্কোর (Security Score)
    let securityScore = logScale(defense, 3.0);
    if (defense < 15) {
        securityScore -= (15 - defense) * 3; // সামরিক খাতে কম তহবিল দেওয়ার জন্য কঠোর জরিমানা (Severe penalty for underfunding military)
    }

    // মূল্যস্ফীতি স্কোর (Inflation Score - নতুন লজিক! | New Logic!)
    // উচ্চ ঋণ এবং পরিকাঠামো তৈরি ছাড়া উচ্চ কল্যাণের কারণে মূল্যস্ফীতি বৃদ্ধি পায় (Driven by high borrowing and high welfare without corresponding infra)
    let inflationScore = (borrow * 2.5);
    if (welfare > 20 && infra < 20) {
        inflationScore += (welfare - infra) * 1.0;
    }

    // চরম মূল্যস্ফীতি সুখ এবং প্রবৃদ্ধিকে পুরোপুরি ধ্বংস করে দেয় (Extreme inflation destroys happiness and growth completely)
    if (inflationScore > 35) {
        happyScore -= (inflationScore - 35) * 1.2; // সুখের ওপর আরও কঠোর জরিমানা (Sharper penalty on happiness)
        growthScore -= (inflationScore - 35) * 1.5; // প্রবৃদ্ধির ওপর আরও কঠোর জরিমানা (Sharper penalty on growth)
    }

    // ৫. শতাংশে (০-১০০%) রূপান্তর (5. Scaling to 0-100%)
    // ১০০% তে পৌঁছানো কঠিন করার জন্য হর (Denominators) বাড়ানো হয়েছে। (Denominators increased to make reaching 100% harder)
    // এটি বোঝায় যে একটি নিখুঁত অর্থনীতি তৈরি করা প্রায় অসম্ভব, কারণ ট্রেড-অফ থাকবেই। (Simulates that a perfect economy is essentially impossible due to trade-offs)
    const growthPercent = Math.max(0, Math.min(100, (growthScore / 90) * 100));
    const happyPercent = Math.max(0, Math.min(100, (happyScore / 100) * 100));
    const securityPercent = Math.max(0, Math.min(100, (securityScore / 60) * 100)); // নিরাপত্তা এখনও অর্জনযোগ্য (Security still achievable)
    const inflationPercent = Math.max(0, Math.min(100, (inflationScore / 60) * 100)); // মূল্যস্ফীতি দ্রুত পূরণ হয় (Inflation fills up faster)

    // ৬. ইউজার ইন্টারফেস মিটার আপডেট করা হচ্ছে (6. Update Meters in UI)
    document.getElementById('meter-growth').style.width = growthPercent + "%";
    document.getElementById('meter-happy').style.width = happyPercent + "%";
    document.getElementById('meter-security').style.width = securityPercent + "%";
    document.getElementById('meter-inflation').style.width = inflationPercent + "%";

    // ৭. অর্থমন্ত্রীর জন্য ফিডব্যাক তৈরি (7. Feedback Generation)
    let feedback = "";
    if (inflationPercent > 70) {
        feedback = "🚨 HYPERINFLATION! Prices are out of control because of excessive borrowing and handouts. The economy is crashing!";
        document.getElementById('meter-inflation').style.background = "#8e44ad"; // চরম বিপদের চিহ্ন - গাঢ় বেগুনি (Extreme danger indicator - Dark Purple)
    } else if (securityPercent < 50) {
        feedback = "⚠️ National Security is at risk! Enemies might attack. Increase Defense spending.";
    } else if (happyPercent < 40) {
        feedback = "⚠️ The public is very angry with high taxes and/or low welfare. You might lose the election.";
    } else if (growthPercent < 40) {
        feedback = "⚠️ Economy is stagnant due to high corporate taxes or low infrastructure. Future generations will be poor.";
    } else if (totalSpent < totalBudget - 10) {
        feedback = "You have a surplus. Consider paying down debt (reducing borrowing) or cutting taxes.";
    } else {
        feedback = "👏 Balanced Budget! You are managing taxes, debt, and spending trade-offs well.";
    }

    // মূল্যস্ফীতি স্বাভাবিক থাকলে লাল রঙে ফিরিয়ে আনা (Reset inflation meter to red if it drops back normal)
    if (inflationPercent <= 70) {
        document.getElementById('meter-inflation').style.background = "#c0392b"; // লাল রঙে রিসেট (Reset to red)
    }

    document.getElementById('minister-feedback').innerText = feedback;
}

// পলিসি চিন্তাভাবনার (Policy Thinking) আউটকাম দেখানোর ফাংশন (Function to show policy thinking outcomes)
function showOutcome(choice) {
    const outcomeDiv = document.getElementById('policy-outcome');
    let title = "";
    let message = "";
    let color = "";

    switch (choice) {
        case 'highway':
            title = "Outcome: Build Expressway";
            message = "<strong>Impact:</strong> Creates jobs immediately (construction). Reduces transport costs for businesses, leading to lower prices later. <br><br><strong>Verdict:</strong> Good for long-term growth (Capital Expenditure).";
            color = "#d4edda"; // সবুজ (Green)
            break;
        case 'waiver':
            title = "Outcome: Farm Loan Waiver";
            message = "<strong>Impact:</strong> Farmers feel immediate relief. But banks lose money and may stop lending to farmers in future. No new asset is created.<br><br><strong>Verdict:</strong> Bad economics, but often good politics (Revenue Expenditure).";
            color = "#f8d7da"; // লাল (Red)
            break;
        case 'taxcut':
            title = "Outcome: Cut Income Tax";
            message = "<strong>Impact:</strong> Middle class has more money to spend. Consumption increases, boosting businesses. <br><br><strong>Verdict:</strong> Good for demand, but government has less money for schools and hospitals.";
            color = "#fff3cd"; // হলুদ (Yellow)
            break;
    }

    outcomeDiv.style.display = 'block';
    outcomeDiv.style.backgroundColor = color;
    outcomeDiv.innerHTML = `<h4>${title}</h4><p>${message}</p>`;
}

// পেজ লোড হলে ফাংশনটি স্বয়ংক্রিয়ভাবে চালু হবে (Init on page load)
window.onload = updateBudget;
