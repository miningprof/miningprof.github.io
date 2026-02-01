/**
 * CLT Lab Simulation Script
 * "The Engaging Mentor" Edition
 */

// State
let state = {
    distribution: 'uniform',
    sampleSize: 5,
    means: [],
    isAutoRunning: false
};

// UI Elements
const els = {
    parentDist: document.getElementById('parentDist'),
    sampleSize: document.getElementById('sampleSize'),
    btnSample: document.getElementById('btn-sample'),
    btnReset: document.getElementById('btn-reset'),
    btnAuto: document.getElementById('btn-autorun'),
    statCount: document.getElementById('stat-count'),
    statMean: document.getElementById('stat-mean'),
    animZone: document.getElementById('anim-zone'),
    modal: document.getElementById('challenge-modal')
};

// Charts
let parentChart, sampleChart;

// --------------------------------------------------------------------------
// Modal Control (Phase 4)
// --------------------------------------------------------------------------

function closeModal() {
    els.modal.style.opacity = '0';
    setTimeout(() => {
        els.modal.style.display = 'none';
        showToast("Welcome to the laboratory.", "fa-solid fa-door-open");
    }, 500);
}
// Expose to global scope for HTML button
window.closeModal = closeModal;

// --------------------------------------------------------------------------
// Chart Configuration
// --------------------------------------------------------------------------

const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false }
    },
    scales: {
        x: {
            type: 'linear',
            min: 0,
            max: 1,
            grid: { color: 'rgba(255, 255, 255, 0.1)' },
            ticks: { color: '#94a3b8' }
        },
        y: {
            display: false
        }
    },
    animation: {
        duration: 400
    }
};

function initCharts() {
    // 1. Parent Chart
    const ctxParent = document.getElementById('parentChart').getContext('2d');
    parentChart = new Chart(ctxParent, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Probability Density',
                borderColor: '#06b6d4', // Cyan
                backgroundColor: 'rgba(6, 182, 212, 0.2)',
                fill: true,
                borderWidth: 2,
                pointRadius: 0,
                data: []
            }]
        },
        options: {
            ...commonOptions,
            plugins: { title: { display: false } }
        }
    });

    // 2. Sample Chart (Histogram)
    const ctxSample = document.getElementById('sampleChart').getContext('2d');
    sampleChart = new Chart(ctxSample, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Frequency',
                backgroundColor: '#8b5cf6', // Purple
                data: [],
                barPercentage: 1.0,
                categoryPercentage: 1.0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: '#94a3b8',
                        maxTicksLimit: 10,
                        callback: function (val, index) {
                            return (index / 40).toFixed(1);
                        }
                    }
                },
                y: { display: false }
            }
        }
    });

    updateParentChart();
}

// --------------------------------------------------------------------------
// Logic
// --------------------------------------------------------------------------

function getParentDataPoints() {
    const points = [];
    const steps = 100;

    for (let i = 0; i <= steps; i++) {
        const x = i / steps;
        let y = 0;

        if (state.distribution === 'uniform') {
            y = 1;
        } else if (state.distribution === 'skewed') {
            y = 3 * Math.exp(-3 * x);
        } else if (state.distribution === 'bimodal') {
            const p1 = Math.exp(-Math.pow(x - 0.2, 2) / 0.02);
            const p2 = Math.exp(-Math.pow(x - 0.8, 2) / 0.02);
            y = p1 + p2;
        } else if (state.distribution === 'parabolic') {
            y = 12 * Math.pow(x - 0.5, 2) + 0.2;
        } else if (state.distribution === 'triangular') {
            y = x < 0.5 ? 4 * x : 4 * (1 - x);
        } else if (state.distribution === 'step') {
            if (x < 0.3) y = 1.66;
            else if (x < 0.7) y = 0.75;
            else y = 0.66;
        }
        points.push({ x, y });
    }
    return points;
}

function updateParentChart() {
    parentChart.data.datasets[0].data = getParentDataPoints();
    parentChart.update();
}

function getRandomValue() {
    if (state.distribution === 'uniform') return Utils.randomUniform(0, 1);
    if (state.distribution === 'skewed') return Utils.randomSkewed();
    if (state.distribution === 'bimodal') return Utils.randomBimodal();
    if (state.distribution === 'parabolic') return Utils.randomParabolic();
    if (state.distribution === 'triangular') return Utils.randomTriangular();
    if (state.distribution === 'step') return Utils.randomStep();
    return 0.5;
}

function takeSample(cnt = 1) {
    for (let k = 0; k < cnt; k++) {
        const samples = [];
        for (let i = 0; i < state.sampleSize; i++) {
            samples.push(getRandomValue());
        }
        const mean = Utils.mean(samples);
        state.means.push(mean);
    }

    updateSampleChart();
    updateStats();
}

function updateSampleChart() {
    const bins = new Array(41).fill(0);

    for (const m of state.means) {
        const binIdx = Math.floor(m * 40);
        if (binIdx >= 0 && binIdx <= 40) {
            bins[binIdx]++;
        }
    }

    sampleChart.data.labels = bins.map((_, i) => (i / 40).toFixed(2));
    sampleChart.data.datasets[0].data = bins;
    sampleChart.update('none');
}

function updateStats() {
    els.statCount.innerText = state.means.length;
    els.statMean.innerText = state.means.length > 0 ? Utils.mean(state.means).toFixed(3) : "0.00";
}

function resetSim() {
    state.means = [];
    updateSampleChart();
    updateStats();
    stopAutoRun();
}

// --------------------------------------------------------------------------
// Animation / Interaction
// --------------------------------------------------------------------------

let autoInterval = null;

function toggleAutoRun() {
    if (state.isAutoRunning) {
        stopAutoRun();
    } else {
        startAutoRun();
    }
}

function startAutoRun() {
    state.isAutoRunning = true;
    els.btnAuto.innerHTML = '<i class="fa-solid fa-pause"></i> Stop';
    els.btnAuto.classList.add('btn-primary');

    // Toast Feedback
    showToast("Accelerating time. Watch the curve smooth out.", "fa-solid fa-forward");

    autoInterval = setInterval(() => {
        takeSample(10);

        // Narrative triggers during Autorun
        const count = state.means.length;
        if (count > 500 && count < 520) {
            showToast("With N > 500, the shape is undeniable. This is the definition of stability.", "fa-solid fa-scale-balanced");
        }
    }, 50);
}

function stopAutoRun() {
    state.isAutoRunning = false;
    els.btnAuto.innerHTML = '<i class="fa-solid fa-forward"></i> Auto-Run (Fast)';
    els.btnAuto.classList.remove('btn-primary');
    clearInterval(autoInterval);
}

// --------------------------------------------------------------------------
// Audio / Toast System
// --------------------------------------------------------------------------

let audioEnabled = false;
const btnAudio = document.getElementById('btn-audio');

function speak(text) {
    if (!audioEnabled) return;

    // User requested "Speech Locking"
    // If already speaking, ignore new requests (don't queue stale info)
    if (window.speechSynthesis.speaking) return;

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    // Try to find a deep/authoritative voice
    const preferredVoice = voices.find(v => v.name.includes('Google US English')) || voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
}

function showToast(message, iconClass = "fa-solid fa-comment-dots") {
    // 1. Audio (if enabled)
    speak(message);

    // 2. Visual Toast
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
        <div class="toast-icon"><i class="${iconClass}"></i></div>
        <div class="toast-message">${message}</div>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

btnAudio.addEventListener('click', () => {
    audioEnabled = !audioEnabled;
    if (audioEnabled) {
        btnAudio.innerHTML = '<i class="fa-solid fa-volume-high"></i> Guide: ON';
        btnAudio.style.background = 'rgba(6, 182, 212, 0.2)';
        btnAudio.style.color = '#06b6d4';
        showToast("Audio output enabled. I will guide you verbally.", "fa-solid fa-microphone");
    } else {
        btnAudio.innerHTML = '<i class="fa-solid fa-volume-xmark"></i> Guide: OFF';
        btnAudio.style.background = 'rgba(255,255,255,0.1)';
        btnAudio.style.color = 'inherit';
        window.speechSynthesis.cancel();
    }
});

// Pre-load voices
window.speechSynthesis.getVoices();


// --------------------------------------------------------------------------
// Event Listeners
// --------------------------------------------------------------------------

els.parentDist.addEventListener('change', (e) => {
    state.distribution = e.target.value;
    updateParentChart();
    resetSim();

    // Educational Toast
    if (state.distribution === 'skewed') {
        showToast("Skewed: Like income distribution. Most people are poor (left), few are rich (right).", "fa-solid fa-chart-area");
    } else if (state.distribution === 'bimodal') {
        showToast("Bimodal: Two distinct peaks. Like combining heights of men and women.", "fa-solid fa-user-group");
    } else {
        showToast("Parent Population changed. The CLT predicts the result will STILL be a bell curve.", "fa-solid fa-shapes");
    }
});

els.sampleSize.addEventListener('input', (e) => {
    state.sampleSize = parseInt(e.target.value);
    document.getElementById('n-val').innerText = state.sampleSize;
    resetSim();

    // Educational Context on N
    if (state.sampleSize < 10) {
        showToast("Small Sample (N<10): The Bell Curve will be wide and sloppy.", "fa-solid fa-compress");
    } else if (state.sampleSize > 25) {
        showToast("Large Sample (N>25): The curve sharpens. Precision increases.", "fa-solid fa-arrows-to-circle");
    }
});

els.btnSample.addEventListener('click', () => {
    takeSample(1);

    // Visual FX
    const ball = document.createElement('div');
    ball.className = 'drop-ball';
    ball.style.left = '50%';
    ball.style.top = '0';
    els.animZone.appendChild(ball);

    setTimeout(() => {
        ball.style.top = '100px';
        ball.style.opacity = '0';
    }, 10);
    setTimeout(() => { ball.remove(); }, 500);

    // Smart Narrator (Toast)
    const count = state.means.length;
    if (count === 1) {
        showToast(`One dot. It is the average of ${state.sampleSize} items.`, "fa-solid fa-circle");
    } else if (count === 10) {
        showToast("A pattern is forming from the noise.", "fa-solid fa-braille");
    } else if (count === 50) {
        showToast("The Law of Large Numbers is taking effect.", "fa-solid fa-scale-unbalanced");
    } else if (count === 100) {
        showToast("There it is. The Gaussian Distribution.", "fa-solid fa-bell");
    }
});

els.btnReset.addEventListener('click', () => {
    resetSim();
    showToast("Experiment Reset. The laws of math remain unchanged.", "fa-solid fa-rotate-right");
});

els.btnAuto.addEventListener('click', toggleAutoRun);

// Init
initCharts();
