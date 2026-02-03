/**
 * Birthday Paradox Lab
 */

const roomContainer = document.getElementById('room-container');
const lineCanvas = document.getElementById('lineCanvas');
const ctx = lineCanvas.getContext('2d');
const btnAdd = document.getElementById('btn-add');
const btnReset = document.getElementById('btn-reset');
const valN = document.getElementById('val-n');
const valPairs = document.getElementById('val-pairs');
const valProb = document.getElementById('val-prob');
const matchMessage = document.getElementById('match-message');
const matchDetails = document.getElementById('match-details');
const btnAudio = document.getElementById('btn-audio');

// State
let people = []; // Array of { id, dayOfYear, x, y, el }
let hasMatch = false;
let lastMatchCount = 0;
let audioEnabled = true;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// --------------------------------------------------------------------------
// Initialization
// --------------------------------------------------------------------------

function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    btnAdd.addEventListener('click', addPerson);
    btnReset.addEventListener('click', reset);
    btnAudio.addEventListener('click', toggleAudio);

    if (audioEnabled) {
        btnAudio.innerHTML = '<i class="fa-solid fa-volume-high"></i> Guide: ON';
        btnAudio.style.background = 'rgba(6, 182, 212, 0.2)';
        btnAudio.style.color = '#06b6d4';
    }
}

function resizeCanvas() {
    lineCanvas.width = roomContainer.offsetWidth;
    lineCanvas.height = roomContainer.offsetHeight;
    drawLines();
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
    // Try to get a good voice
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find(v => v.name.includes('Google US English')) || voices[0];
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
}

// --------------------------------------------------------------------------
// Core Logic
// --------------------------------------------------------------------------

function getDayString(doy) {
    let day = doy;
    for (let i = 0; i < 12; i++) {
        if (day <= DAYS_IN_MONTH[i]) {
            return `${MONTHS[i]} ${day}`;
        }
        day -= DAYS_IN_MONTH[i];
    }
    return "Dec 31"; // Fallback
}

function calculateProbability(n) {
    if (n < 2) return 0;
    // P(Match) = 1 - P(No Match)
    // P(No Match) = 365/365 * 364/365 * ... * (365-n+1)/365
    let pNoMatch = 1;
    for (let i = 0; i < n; i++) {
        pNoMatch *= (365 - i) / 365;
    }
    return (1 - pNoMatch) * 100;
}

function addPerson() {
    if (people.length >= 100) {
        speak("Room is full!");
        return;
    }

    // Hide popup immediately on new action
    matchMessage.style.display = 'none';

    const doy = Math.floor(Math.random() * 365) + 1;
    const dateStr = getDayString(doy);

    // Random Position (avoiding edges)
    const x = 10 + Math.random() * 80;
    const y = 10 + Math.random() * 80;

    const person = {
        id: people.length,
        dayOfYear: doy,
        dateStr: dateStr,
        x: x,
        y: y,
        el: null
    };

    // Create DOM Element
    const el = document.createElement('div');
    el.className = 'person-card';
    el.style.left = x + '%';
    el.style.top = y + '%';
    el.innerHTML = `
        <i class="fa-solid fa-user person-icon"></i>
        <div class="person-date">${dateStr}</div>
    `;
    roomContainer.appendChild(el);
    person.el = el;

    people.push(person);

    // Check for collisions
    checkForMatches();
    updateStats();
}

function checkForMatches() {
    const matches = []; // Array of arrays of people [p1, p2]

    // Naive O(N^2) check is fine for N < 100
    for (let i = 0; i < people.length; i++) {
        for (let j = i + 1; j < people.length; j++) {
            if (people[i].dayOfYear === people[j].dayOfYear) {
                matches.push([people[i], people[j]]);
            }
        }
    }

    // Check if we found NEW matches
    if (matches.length > lastMatchCount) {
        // MATCH FOUND (New one)
        hasMatch = true;

        // Find the specific new match (usually the last one added involves the new person)
        // For simplicity, just grab the first from the list or the latest
        const latestMatch = matches[matches.length - 1];
        const date = latestMatch[0].dateStr;

        matchDetails.innerText = date;
        matchMessage.style.display = 'block';
        speak(`Match found! Shared birthday on ${date}.`);

        // Highlight logic
        matches.forEach(pair => {
            pair[0].el.classList.add('match');
            pair[1].el.classList.add('match');
        });

        drawLines(matches);
    } else if (matches.length > 0) {
        // Just redraw lines if matches exist but no new ones triggering popup
        drawLines(matches);
    } else {
        // Narrator logic (no match yet)
        const n = people.length;
        if (n === 23) {
            speak("We have 23 people. The math says there is a 50% chance of a match now.");
        }
    }

    lastMatchCount = matches.length;
}

function drawLines(matches = []) {
    ctx.clearRect(0, 0, lineCanvas.width, lineCanvas.height);

    if (matches.length === 0) return;

    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#8b5cf6"; // Accent Purple

    const w = lineCanvas.width;
    const h = lineCanvas.height;

    matches.forEach(pair => {
        const p1 = pair[0];
        const p2 = pair[1];

        const x1 = (p1.x / 100) * w;
        const y1 = (p1.y / 100) * h + 20; // +20 offset for icon center roughly
        const x2 = (p2.x / 100) * w;
        const y2 = (p2.y / 100) * h + 20;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    });
}

function updateStats() {
    const n = people.length;
    valN.innerText = n;
    valPairs.innerText = (n * (n - 1)) / 2; // nC2
    valProb.innerText = calculateProbability(n).toFixed(1) + '%';
}

function reset() {
    people = [];
    hasMatch = false;
    lastMatchCount = 0;
    roomContainer.innerHTML = '';
    matchMessage.style.display = 'none';
    ctx.clearRect(0, 0, lineCanvas.width, lineCanvas.height);
    updateStats();
    speak("Room cleared.");
}

init();
