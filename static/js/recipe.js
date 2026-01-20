// === Background Audio Handling ===
const bgAudio = document.getElementById('bg-audio');

// Attempt autoplay (some browsers block it until interaction)
const startAudio = () => {
    bgAudio.play().catch(err => console.log("Audio play blocked:", err));
    window.removeEventListener('click', startAudio);
    window.removeEventListener('keydown', startAudio);
};
window.addEventListener('click', startAudio);
window.addEventListener('keydown', startAudio);

// === Back to Menu button logic ===
const backBtn = document.querySelector('.back-btn');
if (backBtn) {
    backBtn.addEventListener('click', (e) => {
        e.preventDefault();

        // Mark that we're returning from a recipe
        sessionStorage.setItem('fromRecipe', 'true');

        // Stop current music if desired
        bgAudio.pause();

        // Navigate to menu (cooking page)
        window.location.href = '/cooking';
    });
}

// === Hard reload safeguard ===
// If the user hard reloads this recipe page, send them home
if (performance.navigation.type === performance.navigation.TYPE_RELOAD) {
    window.location.href = "/";
}
