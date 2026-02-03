/**
 * Confidence Intervals Lab
 * "The Ring Toss"
 */

const canvas = document.getElementById('ciCanvas');
const ctx = canvas.getContext('2d');
const btnToss = document.getElementById('btn-toss');
const btnReset = document.getElementById('btn-reset');
const valAttempts = document.getElementById('val-attempts');
const valCaught = document.getElementById('val-caught');
const valMissed = document.getElementById('val-missed');
const btnAudio = document.getElementById('btn-audio');

// State
let intervals = []; // { y, mean, low, high, caught, speed }
let trueMean = 0.5; // Normalized center
let attempts = 0;
let caught = 0;
let missed = 0;
let audioEnabled = true;
let isAnimating = true;

// --------------------------------------------------------------------------
// Initialization
// --------------------------------------------------------------------------

function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    btnToss.addEventListener('click', () => tossRings(20));
    btnReset.addEventListener('click', reset);
    btnAudio.addEventListener('click', toggleAudio);

    if (audioEnabled) {
        btnAudio.innerHTML = '<i class="fa-solid fa-volume-high"></i> Guide: ON';
        btnAudio.style.background = 'rgba(6, 182, 212, 0.2)';
        btnAudio.style.color = '#06b6d4';
    }

    requestAnimationFrame(loop);
}

function resizeCanvas() {
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = canvas.parentElement.offsetHeight;
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

function tossRings(count) {
    for (let i = 0; i < count; i++) {
        // Simulate a sample mean from a Normal Distribution around the trueMean
        // Standard Error = 0.05
        const sampleMean = Utils.gaussian(trueMean, 0.05);
        // Margin of Error (approx 2 * SE for 95%)
        const moe = 2 * 0.05;

        const low = sampleMean - moe;
        const high = sampleMean + moe;
        const isCaught = (low <= trueMean && high >= trueMean);

        intervals.push({
            y: canvas.height + Math.random() * 200, // Start below screen
            targetY: 50 + (intervals.length * 15) % (canvas.height - 100), // Stack them
            mean: sampleMean,
            low: low,
            high: high,
            caught: isCaught,
            opacity: 0
        });

        attempts++;
        if (isCaught) caught++; else missed++;
    }

    updateStats();

    // Narrative
    const rate = (caught / attempts * 100).toFixed(1);
    speak(`Tossed ${count} intervals. Current success rate is ${rate} percent.`);
}

function updateStats() {
    valAttempts.innerText = attempts;
    valCaught.innerText = caught;
    valMissed.innerText = missed;
}

function reset() {
    intervals = [];
    attempts = 0;
    caught = 0;
    missed = 0;
    updateStats();
    speak("Cleared. Ready for new attempts.");
}

// --------------------------------------------------------------------------
// Rendering Loop
// --------------------------------------------------------------------------

function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const w = canvas.width;
    const h = canvas.height;

    // Draw True Mean Line (The Pole)
    const poleX = trueMean * w;

    // Glow behind pole
    const grad = ctx.createLinearGradient(poleX, 0, poleX, h);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(poleX - 2, 0, 4, h);

    // Pole line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(poleX, 0);
    ctx.lineTo(poleX, h);
    ctx.stroke();
    ctx.setLineDash([]);

    // Animate and Draw Intervals
    intervals.forEach(inv => {
        // Animation Logic
        if (inv.y > inv.targetY) {
            inv.y -= (inv.y - inv.targetY) * 0.1; // Ease out
            inv.opacity = Math.min(1, inv.opacity + 0.05);
        } else {
            // slowly drift off if too many? For now just keep stacking or recycling
        }

        const y = inv.y;
        const x1 = inv.low * w;
        const x2 = inv.high * w;
        const xm = inv.mean * w;

        const color = inv.caught ? '#4ade80' : '#f87171'; // Green or Red

        ctx.globalAlpha = inv.opacity;

        // Draw Interval Line
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.stroke();

        // Draw End Caps
        ctx.beginPath(); ctx.moveTo(x1, y - 3); ctx.lineTo(x1, y + 3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x2, y - 3); ctx.lineTo(x2, y + 3); ctx.stroke();

        // Draw Mean Dot
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(xm, y, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1.0;
    });

    requestAnimationFrame(loop);
}

// Utils (Gaussian Random) - Simple Box-Muller transform
const Utils = {
    gaussian: (mean, stdev) => {
        const u = 1 - Math.random();
        const v = Math.random();
        const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        return z * stdev + mean;
    }
};

init();
