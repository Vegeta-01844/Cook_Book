const characters = [...document.querySelectorAll(".character")];
const row = document.querySelector(".characters-row"); // fixed selector
const spinBtn = document.getElementById("spinBtn");
const goBtn = document.getElementById("goBtn");
const mysteryText = document.getElementById("mysteryText");

const ambientAudio = document.getElementById("ambientAudio");
const characterAudio = document.getElementById("characterAudio");

let selectedCharacter = null;
let recent = [];
let isSpinning = false;

/* ===============================
   AMBIENT AUDIO INIT
   =============================== */
document.body.addEventListener("click", () => {
    ambientAudio.volume = 0.35;
    ambientAudio.loop = true;
    ambientAudio.play().catch(() => {});
}, { once: true });

/* ===============================
   SPIN BUTTON
   =============================== */
spinBtn.addEventListener("click", () => {
    if (isSpinning) return;
    isSpinning = true;

    spinBtn.disabled = true;
    goBtn.disabled = true;

    resetCharacters();
    document.body.classList.add("spin-active");

    const pool = getPool();
    selectedCharacter = pool[Math.floor(Math.random() * pool.length)];
    recent.push(selectedCharacter.dataset.name);

    spinQueueTo(selectedCharacter);
});

/* ===============================
   QUEUE ANIMATION (ONE DIRECTION, 4.8s)
   =============================== */
function spinQueueTo(target) {
    const viewport = document.querySelector(".queue-viewport");
    const viewportCenter = viewport.offsetWidth / 2;

    const targetRect = target.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();

    const targetCenter = targetRect.left - rowRect.left + targetRect.width / 2;
    const distance = viewportCenter - targetCenter;

    // Force single-direction smooth animation
    row.style.transition = "transform 4.8s cubic-bezier(0.22, 0.61, 0.36, 1)";
    row.style.transform = `translateX(${distance}px)`;

    setTimeout(() => revealCharacter(target), 4800);
}

/* ===============================
   REVEAL CHARACTER
   =============================== */
function revealCharacter(target) {
    characters.forEach(c => {
        if (c === target) {
            c.classList.remove("silhouette");
            c.classList.add("selected");
        } else {
            c.classList.add("dimmed");
        }
    });

    playCharacterAudio(target.dataset.audio);

    mysteryText.textContent = "";
    mysteryText.classList.add("show");

    spinBtn.disabled = false;
    goBtn.disabled = false;
    isSpinning = false;

    setTimeout(() => {
        document.body.classList.remove("spin-active");
    }, 800);
}

/* ===============================
   POOL OF CHARACTERS
   =============================== */
function getPool() {
    let pool = characters.filter(c => !recent.includes(c.dataset.name));
    if (!pool.length) {
        recent = [];
        pool = characters;
    }
    return pool;
}

/* ===============================
   PLAY CHARACTER AUDIO
   =============================== */
function playCharacterAudio(file) {
    if (!file) return;

    ambientAudio.volume = 0.4;
    characterAudio.pause();
    characterAudio.currentTime = 0;
    characterAudio.src = `/static/audio/${file}`;
    characterAudio.volume = 1;
    characterAudio.play().catch(() => {});
}

/* ===============================
   GO BUTTON
   =============================== */
goBtn.addEventListener("click", () => {
    if (!selectedCharacter) return;

    let routes;
    try {
        routes = JSON.parse(selectedCharacter.dataset.route);
    } catch {
        routes = [selectedCharacter.dataset.route];
    }

    const destination = routes[Math.floor(Math.random() * routes.length)];
    window.location.href = destination;
});

/* ===============================
   RESET QUEUE & CHARACTERS
   =============================== */
function resetCharacters() {
    characterAudio.pause();
    characterAudio.currentTime = 0;
    ambientAudio.volume = 0.35;

    row.style.transition = "none";
    row.style.transform = "translateX(0)";

    characters.forEach(c => {
        c.classList.remove("selected", "dimmed");
        c.classList.add("silhouette");
    });

    mysteryText.classList.remove("show");
}
