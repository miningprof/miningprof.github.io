/**
 * Bayes Unit Square Lab
 * Visualizes P(H|E) as an area ratio.
 */

// Canvas & Context
const canvas = document.getElementById('bayesCanvas');
const ctx = canvas.getContext('2d');

// DOM Elements
const valPrior = document.getElementById('val-prior');
const valTpr = document.getElementById('val-tpr');
const valFpr = document.getElementById('val-fpr');
const valPosterior = document.getElementById('val-posterior');
const scenarioSelect = document.getElementById('scenario-select');
const btnAudio = document.getElementById('btn-audio');

// State
let state = {
    prior: 0.5,       // P(H) - Vertical Line x-pos (0 to 1)
    tpr: 0.8,         // P(E|H) - Height of Left Bar (0 to 1)
    fpr: 0.1,         // P(E|~H) - Height of Right Bar (0 to 1)

    // UI State
    dragging: null,   // 'prior', 'tpr', 'fpr', or null
    width: 0,
    height: 0,
    padding: 40
};

let audioEnabled = true;

// Colors
const COLORS = {
    bg: '#161b22',
    line: '#30363d',
    priorLine: '#f2cc8f', // Gold
    truePos: 'rgba(88, 166, 255, 0.3)', // Blue low opacity
    truePosSolid: '#58a6ff',
    falsePos: 'rgba(248, 113, 113, 0.3)', // Red low opacity
    falsePosSolid: '#f87171',
    text: '#8b949e',
    textLight: '#e6edf3'
};

// --- INITIALIZATION ---
function init() {
    resize();
    window.addEventListener('resize', resize);

    // Input Handling
    canvas.addEventListener('mousedown', onPointerDown);
    canvas.addEventListener('mousemove', onPointerMove);
    canvas.addEventListener('mouseup', onPointerUp);
    canvas.addEventListener('mouseleave', onPointerUp);

    // Touch support
    canvas.addEventListener('touchstart', (e) => onPointerDown(e.touches[0]));
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); onPointerMove(e.touches[0]); });
    canvas.addEventListener('touchend', onPointerUp);

    // Scenario Select
    scenarioSelect.addEventListener('change', loadScenario);

    // Initial Draw
    requestAnimationFrame(loop);

    // Init Voice
    window.speechSynthesis.getVoices();

    // Initialize Audio Button State (reflecting audioEnabled = true)
    if (audioEnabled) {
        btnAudio.innerHTML = '<i class="fa-solid fa-volume-high"></i> Guide: ON';
        btnAudio.style.background = 'rgba(6, 182, 212, 0.2)';
        btnAudio.style.color = '#06b6d4';
    }

    // Audio Button Listener
    btnAudio.addEventListener('click', () => {
        audioEnabled = !audioEnabled;
        if (audioEnabled) {
            btnAudio.innerHTML = '<i class="fa-solid fa-volume-high"></i> Guide: ON';
            btnAudio.style.background = 'rgba(6, 182, 212, 0.2)';
            btnAudio.style.color = '#06b6d4';
            showToast("Audio output enabled. I will guide you verbally.");
        } else {
            btnAudio.innerHTML = '<i class="fa-solid fa-volume-xmark"></i> Guide: OFF';
            btnAudio.style.background = 'rgba(255,255,255,0.1)';
            btnAudio.style.color = 'inherit';
            window.speechSynthesis.cancel();
        }
    });

    // Show Modal
    setTimeout(() => {
        document.getElementById('challenge-modal').style.display = 'flex';
    }, 500);
}

function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    state.width = canvas.width - (state.padding * 2);
    state.height = canvas.height - (state.padding * 2);
}

// --- LOGIC ---

function loadScenario(e) {
    const val = e.target.value;
    switch (val) {
        case 'mammogram': // Rare disease (1%), Good Test (90% sens, 9% false pos)
            animateTo(0.01, 0.90, 0.09);
            showToast("Scenario: Rare Disease. Notice how thin the Prior strip is.");
            break;
        case 'spam': // Common (50%), "Money" word (80% in spam, 5% in ham)
            animateTo(0.50, 0.80, 0.05);
            showToast("Scenario: Spam Filter. 'Money' appears often in spam, rarely in ham.");
            break;
        case 'fair': // Coin flip
            animateTo(0.50, 0.50, 0.50);
            showToast("A fair coin tells you nothing.");
            break;
        default:
            break;
    }
}

function animateTo(targetPrior, targetTpr, targetFpr) {
    // Simple lerp animation could go here, for now direct set
    state.prior = targetPrior;
    state.tpr = targetTpr;
    state.fpr = targetFpr;
    updateStats();
}

function updateStats() {
    // Calculate Posterior
    // P(H|E) = (P(E|H) * P(H)) / [ (P(E|H)*P(H)) + (P(E|~H)*(1-P(H))) ]

    const numerator = state.tpr * state.prior; // Area of True Positive
    const denominator = numerator + (state.fpr * (1 - state.prior)); // Total Positive Area

    const posterior = denominator === 0 ? 0 : numerator / denominator;

    // Update Text
    valPrior.innerText = (state.prior * 100).toFixed(1) + '%';
    valTpr.innerText = (state.tpr * 100).toFixed(1) + '%';
    valFpr.innerText = (state.fpr * 100).toFixed(1) + '%';
    valPosterior.innerText = (posterior * 100).toFixed(1) + '%'; // No decimal for big impact? maybe 1
}


// --- RENDERING ---

function loop() {
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Unit Square Base
    const originX = state.padding;
    const originY = state.padding;
    const w = state.width;
    const h = state.height;

    // Background of Square (The Universe)
    ctx.fillStyle = '#21262d';
    ctx.fillRect(originX, originY, w, h);

    // 1. Draw Prior Line (Vertical)
    const splitX = originX + (state.prior * w);

    // Left Box (Hypothesis True)
    // Draw TPR Bar (Bottom Up)
    const tprH = state.tpr * h;
    const tprY = originY + (h - tprH);

    ctx.fillStyle = COLORS.truePos;
    ctx.fillRect(originX, originY, splitX - originX, h); // Full column bg? No, just keep dark

    // The Active Evidence Area (True Positives)
    ctx.fillStyle = COLORS.truePosSolid;
    ctx.fillRect(originX, tprY, splitX - originX, tprH);

    // Right Box (Hypothesis False)
    const fprH = state.fpr * h;
    const fprY = originY + (h - fprH);

    // Active Evidence Area (False Positives)
    ctx.fillStyle = COLORS.falsePosSolid;
    ctx.fillRect(splitX, fprY, (originX + w) - splitX, fprH);


    // Draw Lines & Handles
    ctx.lineWidth = 2;

    // Prior Divider
    ctx.strokeStyle = COLORS.priorLine;
    ctx.beginPath();
    ctx.moveTo(splitX, originY - 10);
    ctx.lineTo(splitX, originY + h + 10);
    ctx.stroke();

    // TPR Handle (Line)
    ctx.strokeStyle = COLORS.truePosSolid;
    ctx.beginPath();
    ctx.moveTo(originX, tprY);
    ctx.lineTo(splitX, tprY);
    ctx.stroke();

    // FPR Handle (Line)
    ctx.strokeStyle = COLORS.falsePosSolid;
    ctx.beginPath();
    ctx.moveTo(splitX, fprY);
    ctx.lineTo(originX + w, fprY);
    ctx.stroke();

    // Text Labels on Canvas
    ctx.fillStyle = 'white';
    ctx.font = '12px Inter';
    ctx.textAlign = 'center';

    if (state.prior > 0.1) ctx.fillText("Event Exists (Real)", (originX + splitX) / 2, originY - 15);
    if (state.prior < 0.9) ctx.fillText("Event Absent (Fake)", (splitX + originX + w) / 2, originY - 15);

    updateStats();
    requestAnimationFrame(loop);
}

// --- INTERACTION ---

function onPointerDown(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Hit/Hit Logic - simple distance check
    const originX = state.padding;
    const w = state.width;
    const splitX = originX + (state.prior * w);

    // Check Prior Line
    if (Math.abs(x - splitX) < 20) {
        state.dragging = 'prior';
        showToast("Adjusting Prior Probability...");
        return;
    }

    const h = state.height;
    const originY = state.padding;

    // Check TPR Line (Left side)
    const tprY = originY + (state.height * (1 - state.tpr));
    if (x < splitX && Math.abs(y - tprY) < 20) {
        state.dragging = 'tpr';
        showToast("Changing True Positive Rate (Sensitivity)");
        return;
    }

    // Check FPR Line (Right side)
    const fprY = originY + (state.height * (1 - state.fpr));
    if (x > splitX && Math.abs(y - fprY) < 20) {
        state.dragging = 'fpr';
        showToast("Changing False Positive Rate");
        return;
    }
}

function onPointerMove(e) {
    if (!state.dragging) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.max(state.padding, Math.min(e.clientX - rect.left, canvas.width - state.padding));
    const y = Math.max(state.padding, Math.min(e.clientY - rect.top, canvas.height - state.padding));

    // Normalize 0-1
    const normX = (x - state.padding) / state.width;
    const normY = 1 - ((y - state.padding) / state.height); // Invert Y because canvas 0 is top

    if (state.dragging === 'prior') {
        state.prior = normX;
        scenarioSelect.value = 'custom';
    } else if (state.dragging === 'tpr') {
        state.tpr = normY;
        scenarioSelect.value = 'custom';
    } else if (state.dragging === 'fpr') {
        state.fpr = normY;
        scenarioSelect.value = 'custom';
    }
}

function onPointerUp() {
    state.dragging = null;
}

// --- SHARED UTILS --- (Toast, Modal close)
function closeModal() {
    const modal = document.getElementById('challenge-modal');
    modal.style.opacity = '0';
    setTimeout(() => {
        modal.style.display = 'none';
        showToast("Welcome to the Unit Square.", "fa-solid fa-door-open");
    }, 500);
}

// Toast System (Checking for Global Utils or defining local fallback)
// Toast System
function speak(text) {
    if (!audioEnabled) return;
    if (window.speechSynthesis.speaking) return;

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    // Try to find a deep/authoritative voice
    const preferredVoice = voices.find(v => v.name.includes('Google US English')) || voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
}

function showToast(msg) {
    // 1. Audio
    speak(msg);

    // 2. Visual Layer
    if (window.showToastGlobal) {
        window.showToastGlobal(msg);
    } else {
        // Local fallback
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<i class="fa-solid fa-circle-info"></i> ${msg}`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

init();
