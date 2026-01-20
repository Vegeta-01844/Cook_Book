document.addEventListener("DOMContentLoaded", () => {
    
    // --- Existing Favorite Button Logic ---
    const favoriteForms = document.querySelectorAll("form[action^='/toggle_favorite']");
    favoriteForms.forEach(form => {
        form.addEventListener("submit", (e) => {
            // Note: The action URL pattern in books.html is action="{{ url_for('toggle_favorite', recipe_id=recipe.id) }}"
            // Adjusting the selector to be more robust, although action^='/favorite/' might also work if that's your Flask endpoint structure.
            
            const heart = form.querySelector("span");
            if (!heart) return;

            // Apply a scale animation for feedback
            heart.style.transform = "scale(1.3)";
            setTimeout(() => {
                heart.style.transform = "scale(1)";
            }, 300);
            
            // Note: Since this is a form submission, you might need to use e.preventDefault() 
            // and use Fetch API for an immediate UI update without a full page reload. 
            // For now, keeping the original logic which assumes a full form submit/reload.
        });
    });


    // --- New Recipe Card Expansion/Collapse Logic ---
    const toggleButtons = document.querySelectorAll('.view-recipe-toggle');

    toggleButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent default button action (like following an empty link)
            
            const card = event.target.closest('.card');
            if (!card) return;

            const action = button.getAttribute('data-action');
            
            if (action === 'view') {
                // Collapse all other expanded cards first (Good UX)
                document.querySelectorAll('.card.expanded').forEach(expandedCard => {
                    if (expandedCard !== card) {
                        expandedCard.classList.remove('expanded');
                    }
                });

                // Expand the clicked card
                card.classList.add('expanded');

            } else if (action === 'close') {
                // Collapse the current card
                card.classList.remove('expanded');
            }
            
            // The button text change (e.g., View Full Recipe vs Close) is handled by 
            // the CSS hiding the original 'view' button and revealing the 'close' button
            // within the dynamically shown 'recipe-details' section.
        });
    });
});