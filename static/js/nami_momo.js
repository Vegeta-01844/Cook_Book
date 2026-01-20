// Global variables
let currentStepIndex = 0;
let recipeData = [];
let isErrorDisplaying = false;

// -----------------------------------------------------------
// NEW: Image Configuration Map
// Map specific image paths to the CSS class they need for styling/resizing.
const IMAGE_STYLE_MAP = {
    // Example: Use "size-small" class for a specific image path
    // "/static/pictures/Nami/N10.jpg": "size-small", 
    // Add all your unique image paths and their corresponding CSS classes here
};
// -----------------------------------------------------------


// DOM Elements - Main Dialogue Box
const dialogueTextEl = document.getElementById('dialogue-text');
const speakerNameEl = document.getElementById('speaker-name');
const mainArrowEl = document.getElementById('next-arrow'); 
const mainDialogueBoxEl = document.getElementById('dialogue-box');

// DOM Elements - Image Display
const imageEl = document.getElementById('current-step-image'); // The <img> element
const imageContainerEl = document.getElementById('recipe-image-display'); // The parent <div> container

// DOM Elements - Navigation
const backButtonEl = document.getElementById('back-button'); 
const exitButtonEl = document.getElementById('exit-button'); // NEW: The exit button

// DOM Elements - Left Avatar
const leftAvatarContainerEl = document.getElementById('left-avatar-container');
const leftAvatarImageEl = document.getElementById('left-avatar-image'); // FIX: Not used in logic, but kept for clarity

// DOM Elements - Error/Guard Dialogue Box
const errorDialogueBoxEl = document.getElementById('error-dialogue-box');
const errorSpeakerImageEl = document.getElementById('error-speaker-image');
const errorSpeakerNameEl = document.getElementById('error-speaker-name');
const errorDialogueTextEl = document.getElementById('error-dialogue-text');
const errorArrowEl = document.getElementById('error-next-arrow'); 

// Audio setup
const nextStepSound = new Audio('/static/audio/Extra/Nami_Tact.m4a'); 
nextStepSound.volume = 1.0;
const backgroundMusic = document.getElementById('background-music');
const avatarClickSound = document.getElementById('avatar-click-sound');


/**
 * 1. Fetches the JSON data and initializes the application.
 */
async function fetchData() {
    const response = await fetch('/static/data/recipes/momo_script.json');
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

/**
 * 2. Updates the screen with the current step's data.
 */
function loadStep() {
    // --- 2.1. End of Script Check ---
    if (currentStepIndex >= recipeData.length) {
        // End of the script
        dialogueTextEl.textContent = "The quest is complete! Return to the menu.";
        mainArrowEl.classList.add('hidden');
        errorDialogueBoxEl.classList.add('hidden');
        backButtonEl.classList.add('hidden');
        
        // CRITICAL: SHOW THE EXIT BUTTON at the end
        exitButtonEl.style.display = 'block';
        
        isErrorDisplaying = false;
        return;
    }
    
    // Ensure exit button is hidden during the script
    exitButtonEl.style.display = 'none'; 

    const step = recipeData[currentStepIndex];
    
    // --- 2.2. Back Button Visibility ---
    backButtonEl.classList.toggle('hidden', currentStepIndex === 0);

    // --- 2.3. Dialogue & Speaker Display Logic ---
    isErrorDisplaying = step.speaker.includes('Guard');

    if (isErrorDisplaying) {
        // Error Box Logic
        mainDialogueBoxEl.classList.add('hidden');
        errorDialogueBoxEl.classList.remove('hidden');

        errorSpeakerNameEl.textContent = step.speaker;
        // FIX: Use innerHTML to handle potential <span class="blue-name">Ram</span> formatting
        errorDialogueTextEl.innerHTML = step.dialogue_text; 
        errorArrowEl.classList.remove('hidden');
        
    } else {
        // Main Box Logic
        errorDialogueBoxEl.classList.add('hidden');
        mainDialogueBoxEl.classList.remove('hidden');

        speakerNameEl.textContent = step.speaker;
        // FIX: Use innerHTML to handle potential <span class="blue-name">Ram</span> formatting
        dialogueTextEl.innerHTML = step.dialogue_text;
        mainArrowEl.classList.remove('hidden');
    }

    // --- 2.4. Dynamic Image Styling & Update ---
    
    // 1. Clear any previous custom class from the image container
    imageContainerEl.className = ''; 

    // 2. Check the configuration map for the current image path
    const customClass = IMAGE_STYLE_MAP[step.image_path];

    if (customClass) {
        // Apply the special class to the *container* for resizing/styling
        imageContainerEl.classList.add(customClass);
    }
    
    // 3. Update the image source
    imageEl.src = step.image_path; 
    imageEl.alt = step.dialogue_text.substring(0, 50);
}

/**
* 3. Advances to the next step and handles sound/logic.
 */
function handleAdvance() {
    // Only advance if we are NOT at the end of the data
    if (currentStepIndex < recipeData.length) {
        
        // Attempt to start background music upon first interaction (if paused)
        if (backgroundMusic.paused) {
            backgroundMusic.play().catch(e => { /* Autoplay failed, ignore error */ });
        }

        // Play the step advance sound effect
        nextStepSound.currentTime = 0; 
        nextStepSound.play().catch(e => console.log("Step sound play failed:", e)); 

        currentStepIndex++;
        loadStep();
    }
}

/**
 * 4. Moves back one step.
 */
function handleBacktrack() {
    if (currentStepIndex > 0) {
        currentStepIndex--;
        loadStep();
    }
}

/**
 * Plays a sound when the left avatar is clicked.
 */
function handleAvatarClick() {
    avatarClickSound.currentTime = 0;
    avatarClickSound.play().catch(e => console.log("Avatar click sound failed:", e));
}


// --- 5. Event Listeners ---

// Listener for key press 
document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight' || event.key === ' ') {
        handleAdvance();
    } else if (event.key === 'ArrowLeft') { 
        handleBacktrack();
    }
});

// Listener for click on the active dialogue box
mainDialogueBoxEl.addEventListener('click', handleAdvance);
errorDialogueBoxEl.addEventListener('click', handleAdvance);

// Listener for click on the new back button
backButtonEl.addEventListener('click', handleBacktrack);

// Listener for click on the left avatar
leftAvatarContainerEl.addEventListener('click', handleAvatarClick);


// --- 6. Initialization ---
document.addEventListener('DOMContentLoaded', fetchData);