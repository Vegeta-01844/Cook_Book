// -------------------------
// GLOBALS
// -------------------------
let currentStepIndex = 0;
let recipeData = [];
let isErrorDisplaying = false;

// Image style map (optional)
const IMAGE_STYLE_MAP = {};

// DOM references
const dialogueTextEl = document.getElementById('dialogue-text');
const speakerNameEl = document.getElementById('speaker-name');
const mainArrowEl = document.getElementById('next-arrow');
const mainDialogueBoxEl = document.getElementById('dialogue-box');

const imageEl = document.getElementById('current-step-image');
const imageContainerEl = document.getElementById('recipe-image-display');

const backButtonEl = document.getElementById('back-button');
const exitButtonEl = document.getElementById('exit-button');

const errorDialogueBoxEl = document.getElementById('error-dialogue-box');
const errorSpeakerImageEl = document.getElementById('error-speaker-image');
const errorSpeakerNameEl = document.getElementById('error-speaker-name');
const errorDialogueTextEl = document.getElementById('error-dialogue-text');
const errorArrowEl = document.getElementById('error-next-arrow');

const nextStepSound = new Audio('/static/audio/Extra/Zoro_Sword.m4a');  // CHANGE HERE !!!!!!!!!!!!!!!!!!!!
nextStepSound.volume = 0.7;
const backgroundMusic = document.getElementById('background-music');
backgroundMusic.volume=0.3;
const avatarClickSound = document.getElementById('avatar-click-sound');

const leftAvatarContainerEl = document.getElementById('left-avatar-container');


// -------------------------
// FETCH RECIPE DATA
// -------------------------
async function fetchData() {
    const response = await fetch('/static/data/recipes/zoro_kolhapuri_egg.json');
    recipeData = await response.json();

    const username = window.username || "traveler";
    recipeData.forEach(step => {
        if (!step.dialogue_text) return;

        if (Array.isArray(step.dialogue_text)) {
            step.dialogue_text = step.dialogue_text.map(line =>
                line.replace("[username]", `<span class="username">${username}</span>`)
            );
        } else {
            step.dialogue_text = step.dialogue_text.replace("[username]", `<span class="username">${username}</span>`);
        }
    });

    backgroundMusic.play().catch(() => {});
    loadStep();
}

// -------------------------
// LOAD STEP
// -------------------------
function loadStep() {
    if (currentStepIndex >= recipeData.length) {
        dialogueTextEl.textContent = "Quest Complete! Return to the menu.";
        mainArrowEl.classList.add('hidden');
        backButtonEl.classList.add('hidden');
        exitButtonEl.style.display = 'block';
        return;
    }

    exitButtonEl.style.display = 'none';

    const step = recipeData[currentStepIndex];
    backButtonEl.classList.toggle('hidden', currentStepIndex === 0);

    isErrorDisplaying = step.speaker.includes("Guard");

    if (isErrorDisplaying) {
        mainDialogueBoxEl.classList.add('hidden');
        errorDialogueBoxEl.classList.remove('hidden');

        errorSpeakerNameEl.textContent = step.speaker;
        errorDialogueTextEl.innerHTML = step.dialogue_text;
        errorArrowEl.classList.remove('hidden');

    } else {
        errorDialogueBoxEl.classList.add('hidden');
        mainDialogueBoxEl.classList.remove('hidden');

        speakerNameEl.textContent = step.speaker;
        dialogueTextEl.innerHTML = step.dialogue_text;
        mainArrowEl.classList.remove('hidden');
    }

    imageContainerEl.className = '';
    const customClass = IMAGE_STYLE_MAP[step.image_path];
    if (customClass) imageContainerEl.classList.add(customClass);

    imageEl.src = step.image_path;
    imageEl.alt = step.dialogue_text;
}


// -------------------------
// NAVIGATION HANDLERS
// -------------------------
function handleAdvance() {
    nextStepSound.currentTime = 0;
    nextStepSound.play().catch(() => {});

    currentStepIndex++;
    loadStep();
}

function handleBacktrack() {
    if (currentStepIndex > 0) {
        currentStepIndex--;
        loadStep();
    }
}

function handleAvatarClick() {
    avatarClickSound.currentTime = 0;
    avatarClickSound.play().catch(() => {});
}


// -------------------------
// EVENT LISTENERS
// -------------------------
document.addEventListener('keydown', (ev) => {
    if (ev.key === "ArrowRight" || ev.key === " ") handleAdvance();
    if (ev.key === "ArrowLeft") handleBacktrack();
});

mainDialogueBoxEl.addEventListener('click', handleAdvance);
errorDialogueBoxEl.addEventListener('click', handleAdvance);

backButtonEl.addEventListener('click', handleBacktrack);
leftAvatarContainerEl.addEventListener('click', handleAvatarClick);

document.addEventListener('DOMContentLoaded', fetchData);
