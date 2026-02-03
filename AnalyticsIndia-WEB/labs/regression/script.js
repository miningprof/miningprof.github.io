/**
 * Regression Lab
 * "The Engaging Mentor"
 */

const canvas = document.getElementById('regCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const valSlope = document.getElementById('val-slope');
const valR = document.getElementById('val-r');
const valR2 = document.getElementById('val-r2');
const chkResiduals = document.getElementById('chk-residuals');
const chkSquares = document.getElementById('chk-squares');
const btnReset = document.getElementById('btn-reset');
const instruction = document.getElementById('instruction-overlay');
const btnAudio = document.getElementById('btn-audio');

// State
let points = []; // Array of {x, y} in normalized coords (0-1)
let draggingPoint = null;
let m = 0;
let b = 0;
let r = 0;

let audioEnabled = true;

// --------------------------------------------------------------------------
// Initialization
// --------------------------------------------------------------------------

function init() {
    resize();
    window.addEventListener('resize', resize);

    // Interactions
    canvas.addEventListener('mousedown', onPointerDown);
    canvas.addEventListener('mousemove', onPointerMove);
    canvas.addEventListener('mouseup', onPointerUp);
    canvas.addEventListener('mouseleave', onPointerUp);

    // Audio Init
    if (audioEnabled) {
        btnAudio.innerHTML = '<i class="fa-solid fa-volume-high"></i> Guide: ON';
        btnAudio.style.background = 'rgba(6, 182, 212, 0.2)';
        btnAudio.style.color = '#06b6d4';
    }

    // Loop
    requestAnimationFrame(loop);
}

function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    draw();
}

// --------------------------------------------------------------------------
// Core Math
// --------------------------------------------------------------------------

function calculateRegression() {
    if (points.length < 2) {
        m = 0; b = 0.5; r = 0;
        return;
    }

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    const n = points.length;

    for (const p of points) {
        sumX += p.x;
        sumY += p.y;
        sumXY += p.x * p.y;
        sumX2 += p.x * p.x;
        sumY2 += p.y * p.y;
    }

    const numeratorM = (n * sumXY) - (sumX * sumY);
    const denominatorM = (n * sumX2) - (sumX * sumX);

    if (denominatorM === 0) {
        m = 0; // vertical line edge case, simplified
    } else {
        m = numeratorM / denominatorM;
    }

    b = (sumY - m * sumX) / n;

    // Correlation (r)
    const numeratorR = numeratorM;
    const denominatorR = Math.sqrt(((n * sumX2) - (sumX * sumX)) * ((n * sumY2) - (sumY * sumY)));
    r = denominatorR === 0 ? 0 : numeratorR / denominatorR;

    updateStats();
}

function updateStats() {
    // Invert slope for display because screen Y is flipped
    // Actually, let's keep math internal logic consistent: 
    // Normalized: (0,0) top-left.
    // Real math usually expects (0,0) bottom-left. 
    // Let's display "Visual Slope". Since Y goes DOWN as val increases, positive math slope looks "down". 
    // To make it intuitive: Positive Slope = Up/Right. 
    // So if Y decreases as X increases, that's UP.
    // Visual Y = 1 - Math Y.
    // Let's just output raw calculated slope but annotated.

    // Actually, let's flip logic so users think in Cartesian coords (Bottom-Left 0,0)
    // We already store points in Normalized Screen Coords (0,0 Top Left).
    // Let's convert for display.
    const displayM = -m; // Visual slope

    valSlope.innerText = displayM.toFixed(2);
    valR.innerText = r.toFixed(2);
    valR2.innerText = (r * r).toFixed(2);
}

// --------------------------------------------------------------------------
// Audio System
// --------------------------------------------------------------------------

function speak(text) {
    if (!audioEnabled || window.speechSynthesis.speaking) return;
    const u = new SpeechSynthesisUtterance(text);
    const v = window.speechSynthesis.getVoices().find(v => v.name.includes('Google US English'));
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
}

function checkNarrative() {
    // Trigger comments based on R value
    const rAbs = Math.abs(r);

    if (points.length === 3) {
        speak("Three points determine a trend. Notice how the line minimizes the squared distance.");
    }

    if (points.length > 5) {
        if (rAbs > 0.9) {
            speak("Very strong correlation. The points are tightly clustered.");
        } else if (rAbs < 0.3) {
            speak("Weak correlation. The data is just a noisy cloud.");
        }
    }
}

// --------------------------------------------------------------------------
// Rendering
// --------------------------------------------------------------------------

function draw() {
    // Clear
    ctx.fillStyle = '#0f1115';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const w = canvas.width;
    const h = canvas.height;

    // Grid (Subtle)
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
        ctx.beginPath();
        ctx.moveTo(i * w / 10, 0); ctx.lineTo(i * w / 10, h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * h / 10); ctx.lineTo(w, i * h / 10);
        ctx.stroke();
    }

    if (points.length < 2) return;

    // Draw Regression Line
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 3;
    ctx.beginPath();

    // y = mx + b
    const y1 = m * 0 + b;
    const y2 = m * 1 + b;

    ctx.moveTo(0, y1 * h);
    ctx.lineTo(w, y2 * h);
    ctx.stroke();

    // Draw Residuals / Squares
    points.forEach(p => {
        const lineY = m * p.x + b;
        const screenX = p.x * w;
        const screenY = p.y * h;
        const screenLineY = lineY * h;
        const residual = screenLineY - screenY;

        if (chkSquares.checked) {
            ctx.fillStyle = 'rgba(139, 92, 246, 0.1)';
            ctx.strokeStyle = 'rgba(139, 92, 246, 0.3)';
            // Draw square
            ctx.fillRect(screenX, screenY, residual, residual); // Simple geometric square using residual as side
            ctx.strokeRect(screenX, screenY, residual, residual);
        }

        if (chkResiduals.checked) {
            ctx.strokeStyle = '#f87171';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(screenX, screenY);
            ctx.lineTo(screenX, screenLineY);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    });

    // Draw Points
    points.forEach(p => {
        ctx.fillStyle = '#8b5cf6';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#8b5cf6';
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // White border
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
    });
}

function loop() {
    // optional animation loop logic
    draw();
    requestAnimationFrame(loop);
}

// --------------------------------------------------------------------------
// Interaction
// --------------------------------------------------------------------------

function onPointerDown(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / canvas.width;
    const y = (e.clientY - rect.top) / canvas.height;

    // Check hit
    const hitIdx = points.findIndex(p => {
        const dx = p.x - x;
        const dy = p.y - y;
        return (dx * dx + dy * dy) < 0.001; // roughly 20px radius squared normalized
    });

    if (hitIdx >= 0) {
        draggingPoint = points[hitIdx];
    } else {
        // Add point
        points.push({ x, y });
        instruction.style.display = 'none';
        calculateRegression();
        checkNarrative();
    }
}

function onPointerMove(e) {
    if (!draggingPoint) return;

    const rect = canvas.getBoundingClientRect();
    draggingPoint.x = Math.max(0, Math.min(1, (e.clientX - rect.left) / canvas.width));
    draggingPoint.y = Math.max(0, Math.min(1, (e.clientY - rect.top) / canvas.height));

    calculateRegression();
}

function onPointerUp() {
    if (draggingPoint) {
        checkNarrative(); // speak on release
    }
    draggingPoint = null;
}

// --------------------------------------------------------------------------
// UI Listeners
// --------------------------------------------------------------------------

btnReset.addEventListener('click', () => {
    points = [];
    m = 0; b = 0; r = 0;
    instruction.style.display = 'block';
    updateStats();
    draw();
    speak("Canvas cleared.");
});

btnAudio.addEventListener('click', () => {
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
});

init();
