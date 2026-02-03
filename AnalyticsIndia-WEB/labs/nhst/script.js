/**
 * Hypothesis Testing Lab (Signal vs Noise)
 */

const canvas = document.getElementById('nhstCanvas');
const ctx = canvas.getContext('2d');
const sliderAlpha = document.getElementById('slider-alpha');
const valAlpha = document.getElementById('val-alpha');
const valPower = document.getElementById('val-power');
const btnAudio = document.getElementById('btn-audio');

// State
let alpha = 0.05; // 5%
let audioEnabled = true;

// Config
const NULL_MEAN = 0.3;
const ALT_MEAN = 0.6;
const STDEV = 0.12;

// --------------------------------------------------------------------------
// Initialization
// --------------------------------------------------------------------------

function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    sliderAlpha.addEventListener('input', onSliderChange);
    btnAudio.addEventListener('click', toggleAudio);

    if (audioEnabled) {
        btnAudio.innerHTML = '<i class="fa-solid fa-volume-high"></i> Guide: ON';
        btnAudio.style.background = 'rgba(6, 182, 212, 0.2)';
        btnAudio.style.color = '#06b6d4';
    }

    // Initial Render
    update();
}

function resizeCanvas() {
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = canvas.parentElement.offsetHeight;
    update();
}

function toggleAudio() {
    audioEnabled = !audioEnabled;
    if (audioEnabled) {
        btnAudio.innerHTML = '<i class="fa-solid fa-volume-high"></i> Guide: ON';
        btnAudio.style.background = 'rgba(6, 182, 212, 0.2)';
        btnAudio.style.color = '#06b6d4';
        speak("Voice guide enabled.");
    } else {
        btnAudio.innerHTML = '<i class="fa-solid fa-volume-xmark"></i> Guide: OFF';
        btnAudio.style.background = 'rgba(255,255,255,0.1)';
        btnAudio.style.color = 'inherit';
        window.speechSynthesis.cancel();
    }
}

function speak(text) {
    if (!audioEnabled || window.speechSynthesis.speaking) return;
    const u = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find(v => v.name.includes('Google US English')) || voices[0];
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
}

// --------------------------------------------------------------------------
// Core Logic
// --------------------------------------------------------------------------

function onSliderChange(e) {
    alpha = parseFloat(e.target.value) / 100;
    valAlpha.innerText = (alpha * 100) + '%';
    update();

    if (alpha <= 0.01) speak("Very strict. Low false alarm rate, but you might miss the signal.");
    else if (alpha >= 0.20) speak("Very loose. You will catch the signal, but also cry wolf often.");
}

function normalPDF(x, mu, sigma) {
    const num = Math.exp(-0.5 * Math.pow((x - mu) / sigma, 2));
    const den = sigma * Math.sqrt(2 * Math.PI);
    return num / den;
}

// Inverse CDF (Quantile Function) to find x from alpha (right tail)
// Approx or simple look up? Let's use simple approximation or just iterate since per frame
// Actually, simple Z-score lookup table or approximation is better.
// For smooth slider, we can invert Error Function.
// Or simply: x_critical = mu_null + z * sigma
function getCriticalX(alpha) {
    // Probit function approximation?
    // Let's rely on standard Z tables relative to Null
    // Z for 0.05 is 1.645 (one-tailed)

    // Simple Numerical Inverse (binary search) for viz
    let low = NULL_MEAN;
    let high = NULL_MEAN + 4 * STDEV;
    for (let i = 0; i < 20; i++) {
        let mid = (low + high) / 2;
        let areaRight = 0;
        // Rectangle integration from mid to infinity
        // ... too slow?

        // Let's use the browser's own capability if possible, or a simpler trick
        // Actually, we can just position the line visually based on % of curve area?
        // No, let's use the Z-score approx.
        // Z approx for p:
        // Source: Abramowitz and Stegun 26.2.23
        const p = 1 - alpha; // percentile
        // ... complex.

        // Let's iterate visual integration, it's fast enough for 60fps on 100 steps
        // ACTUALLY: Let's assume Z-score.
        // Z ~ 1.645 for 0.05
        // Z from P? 
        // Let's leave criticalX derivation for drawing loop logic
    }

    // Simplified Inverse Erf approximation
    // But since we just need visuals, let's cheat perfectly:
    // We iterate x from -3 to +3 sigma. Sum area. Stop when area > (1-alpha).
    let sum = 0;
    const dx = 0.005;
    for (let x = NULL_MEAN - 4 * STDEV; x < NULL_MEAN + 4 * STDEV; x += dx) {
        sum += normalPDF(x, NULL_MEAN, STDEV) * dx;
        if (sum >= (1 - alpha)) return x;
    }
    return NULL_MEAN + 4 * STDEV;
}

function update() {
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Scales
    const scaleX = w;
    const scaleY = h * 0.8; // Use 80% height
    const baseY = h * 0.9;

    // Find Critical Value (x where Null tail weight = alpha)
    const critX = getCriticalX(alpha);

    // ----------------------
    // Draw Null Distribution (H0) - "Noise"
    // ----------------------
    ctx.beginPath();
    for (let x = 0; x <= 1; x += 0.005) {
        const y = normalPDF(x, NULL_MEAN, STDEV);
        const sx = x * scaleX;
        const sy = baseY - (y * scaleY * 0.3); // Scale down a bit
        if (x === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
    }
    ctx.strokeStyle = '#94a3b8'; // Grey
    ctx.lineWidth = 2;
    ctx.stroke();

    // Fill Alpha Area (Type I Error) - Red Tail of Null > CritX
    ctx.beginPath();
    let started = false;
    for (let x = critX; x <= 1; x += 0.002) {
        const y = normalPDF(x, NULL_MEAN, STDEV);
        const sx = x * scaleX;
        const sy = baseY - (y * scaleY * 0.3);
        if (!started) { ctx.moveTo(sx, baseY); started = true; }
        ctx.lineTo(sx, sy);
    }
    if (started) {
        ctx.lineTo(1 * scaleX, baseY);
        ctx.closePath();
        ctx.fillStyle = 'rgba(248, 113, 113, 0.5)'; // Red
        ctx.fill();
    }

    // ----------------------
    // Draw Alternative Distribution (H1) - "Signal"
    // ----------------------
    ctx.beginPath();
    for (let x = 0; x <= 1; x += 0.005) {
        const y = normalPDF(x, ALT_MEAN, STDEV);
        const sx = x * scaleX;
        const sy = baseY - (y * scaleY * 0.3);
        if (x === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
    }
    ctx.strokeStyle = '#4ade80'; // Green
    ctx.lineWidth = 2;
    ctx.stroke();

    // Fill Beta Area (Type II Error) - Blue Area of Alt < CritX
    ctx.beginPath();
    started = false;
    // Calculate Beta Area (Miss)
    let betaArea = 0;
    const dx = 0.002;

    for (let x = ALT_MEAN - 4 * STDEV; x <= critX; x += dx) {
        const y = normalPDF(x, ALT_MEAN, STDEV);
        betaArea += y * dx;

        const sx = x * scaleX;
        const sy = baseY - (y * scaleY * 0.3);
        if (!started) { ctx.moveTo(sx, baseY); started = true; }
        ctx.lineTo(sx, sy);
    }
    if (started) {
        ctx.lineTo(critX * scaleX, baseY);
        ctx.closePath();
        ctx.fillStyle = 'rgba(96, 165, 250, 0.5)'; // Blue
        ctx.fill();
    }

    // Power Calculation
    const power = (1 - betaArea);
    valPower.innerText = (power * 100).toFixed(1) + '%';

    // ----------------------
    // Draw Critical Line
    // ----------------------
    const critScreenX = critX * scaleX;
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(critScreenX, 0);
    ctx.lineTo(critScreenX, h);
    ctx.stroke();
    ctx.setLineDash([]);

    // Labels
    ctx.font = '14px Inter';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('H0 (Null)', (NULL_MEAN * scaleX) - 20, baseY + 20);

    ctx.fillStyle = '#4ade80';
    ctx.fillText('H1 (Real)', (ALT_MEAN * scaleX) - 20, baseY + 20);

    ctx.fillStyle = '#f87171';
    ctx.fillText('Type I (Alpha)', critScreenX + 10, baseY - 30);

    ctx.fillStyle = '#60a5fa';
    ctx.fillText('Type II (Beta)', critScreenX - 100, baseY - 10);
}

init();
