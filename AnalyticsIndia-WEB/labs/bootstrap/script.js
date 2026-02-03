/**
 * Bootstrap Lab
 * "The Data Factory"
 */

const canvas = document.getElementById('bootstrapCanvas');
const ctx = canvas.getContext('2d');
const originalDiv = document.getElementById('original-sample');
const btnOne = document.getElementById('btn-resample-1');
const btnThousand = document.getElementById('btn-resample-1000');
const valCount = document.getElementById('val-count');
const valMean = document.getElementById('val-mean');
const btnAudio = document.getElementById('btn-audio');

// State
let originalData = []; // [0.1, 0.5, ...]
let bootstrapMeans = []; // [0.45, 0.51, ...]
let audioEnabled = true;

// Visualization Params
const BINS = 50;
let binCounts = new Array(BINS).fill(0);
let maxFreq = 0;

// --------------------------------------------------------------------------
// Initialization
// --------------------------------------------------------------------------

function init() {
    // Generate random original sample (skewed dist)
    for (let i = 0; i < 15; i++) {
        // Skewed: beta(2,5) approx
        let x = Math.pow(Math.random(), 2);
        originalData.push(x);
    }

    // Visualize Original
    originalData.forEach(val => {
        const dot = document.createElement('div');
        dot.className = 'data-dot';
        dot.style.left = (val * 100) + '%';
        originalDiv.appendChild(dot);
    });

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    btnOne.addEventListener('click', () => runResample(1, true));
    btnThousand.addEventListener('click', () => runResample(1000, false));
    btnAudio.addEventListener('click', toggleAudio);

    if (audioEnabled) {
        btnAudio.innerHTML = '<i class="fa-solid fa-volume-high"></i> Guide: ON';
        btnAudio.style.background = 'rgba(6, 182, 212, 0.2)';
        btnAudio.style.color = '#06b6d4';
    }

    draw(); // Initial clear
}

function resizeCanvas() {
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = canvas.parentElement.offsetHeight;
    draw();
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

function runResample(n, animate) {
    for (let k = 0; k < n; k++) {
        // 1. Resample with replacement
        const sample = [];
        for (let i = 0; i < originalData.length; i++) {
            const pick = originalData[Math.floor(Math.random() * originalData.length)];
            sample.push(pick);
        }

        // 2. Calculate Mean
        const mean = sample.reduce((a, b) => a + b, 0) / sample.length;
        bootstrapMeans.push(mean);

        // 3. Update Histogram Bins
        const bin = Math.floor(mean * BINS);
        if (bin >= 0 && bin < BINS) {
            binCounts[bin]++;
            if (binCounts[bin] > maxFreq) maxFreq = binCounts[bin];
        }
    }

    updateStats();
    draw();

    if (n === 1000) {
        speak(`Generated 1000 resamples. Notice how the histogram forms a bell curve, even if the original data was skewed.`);
    } else if (bootstrapMeans.length === 1) {
        speak("That dot represents the mean of one simulated experiment.");
    }
}

function updateStats() {
    valCount.innerText = bootstrapMeans.length;
    if (bootstrapMeans.length > 0) {
        const avg = bootstrapMeans.reduce((a, b) => a + b, 0) / bootstrapMeans.length;
        valMean.innerText = avg.toFixed(3);
    }
}

// --------------------------------------------------------------------------
// Rendering
// --------------------------------------------------------------------------

function draw() {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (bootstrapMeans.length === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.font = '20px Inter';
        ctx.textAlign = 'center';
        ctx.fillText("Resample to build distribution", w / 2, h / 2);
        return;
    }

    const barW = w / BINS;
    const scaleY = (h - 20) / (maxFreq > 0 ? maxFreq : 1);

    ctx.fillStyle = '#8b5cf6';

    for (let i = 0; i < BINS; i++) {
        const count = binCounts[i];
        if (count > 0) {
            const barH = count * scaleY;
            const x = i * barW;
            const y = h - barH;

            // Draw bar
            ctx.fillRect(x + 1, y, barW - 2, barH);
        }
    }
}

init();
