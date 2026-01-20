// Open a specific tab
function openTab(tabName, event) {
    // Hide all tab contents
    const tabcontent = document.getElementsByClassName("tab-content");
    for (let i = 0; i < tabcontent.length; i++) {
        tabcontent[i].classList.remove('active');
        // Setting display to none explicitly if not using Tailwind's 'hidden' class
        tabcontent[i].style.display = 'none'; 
    }

    // Reset all tab links
    const tablinks = document.getElementsByClassName("tab-link");
    for (let i = 0; i < tablinks.length; i++) {
        // Use an 'active' class for styling instead of raw Tailwind classes here
        tablinks[i].classList.remove('active');
    }

    // Show selected tab content
    const tab = document.getElementById(tabName);
    if (tab) {
        tab.classList.add('active');
        tab.style.display = 'block';
    }

    // Highlight clicked tab
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
}

// Automatically open Recipe Management tab on page load
window.addEventListener('DOMContentLoaded', () => {
    const firstTabLink = document.getElementById('recipes-tab-link');
    if (firstTabLink) {
        // Instead of .click(), we call openTab directly for reliable execution on load
        openTab('recipe-management', { currentTarget: firstTabLink });
    }

    // Ensure edit modal is hidden initially
    const modal = document.getElementById('editModal');
    if (modal) modal.classList.add('hidden');

    // Close modal when clicking outside modal content
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) hideEditModal();
        });
    }
});

// Populate the Edit Modal with selected recipe data
function populateEditForm(buttonElement) {
    if (!buttonElement) return;

    const recipeDataString = buttonElement.getAttribute('data-recipe');
    if (!recipeDataString) return;

    try {
        const recipe = JSON.parse(recipeDataString);
        
        // Populate fields
        document.getElementById('edit_id').value = recipe.id || '';
        document.getElementById('edit_name').value = recipe.name || '';
        document.getElementById('edit_ingredients').value = recipe.ingredients || '';
        document.getElementById('edit_steps').value = recipe.steps || '';
        document.getElementById('edit_category').value = recipe.category || '';
        document.getElementById('edit_char_name').value = recipe.char_name || '';
        document.getElementById('edit_img_url').value = recipe.img_url || '';
        document.getElementById('edit_char_img_url').value = recipe.char_img_url || '';

        // Set dynamic form action
        document.getElementById('editRecipeForm').action = `/admin/edit/${recipe.id}`;

        document.getElementById('editModal').classList.remove('hidden');
    } catch(e) {
        console.error('Invalid JSON in data-recipe:', e);
        // Using a custom message box instead of alert() if one is implemented
        // For simplicity, sticking to the user's provided alert() for now:
        alert('Failed to load recipe details for editing.');
    }
}


// Hide the Edit Modal
function hideEditModal() {
    const modal = document.getElementById('editModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}