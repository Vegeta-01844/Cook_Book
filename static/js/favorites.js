document.addEventListener("DOMContentLoaded", () => {
    // --- 1. Favorite Heart Animation Logic ---
    const favoriteForms = document.querySelectorAll("form[action^='/favorite/']");
    favoriteForms.forEach(form => {
        form.addEventListener("submit", (e) => {
            // This logic provides a quick visual feedback when a user favorites/unfavorites an item.
            const heart = form.querySelector("span");
            if (!heart) return;

            // Simple animation for visual feedback
            heart.style.transform = "scale(1.3)";
            setTimeout(() => {
                heart.style.transform = "scale(1)";
            }, 300);

            // Note: The form will submit normally after this animation.
        });
    });


    // --- 2. Single Card Expand/Collapse Logic (for Detailed Recipe View) ---
    // Using event delegation on the document body for efficiency
    document.body.addEventListener('click', (e) => {
        const toggleButton = e.target.closest('.view-recipe-toggle');

        if (toggleButton) {
            const card = toggleButton.closest('.card');
            if (!card) return;

            const action = toggleButton.getAttribute('data-action');
            
            if (action === 'view') {
                // Expand the card
                card.classList.add('expanded');
                
                // Scroll the expanded card into view without a delay
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
            } else if (action === 'close') {
                // Collapse the card
                card.classList.remove('expanded');

                // Scroll the now-collapsed card back into a readable position
                card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    });
});