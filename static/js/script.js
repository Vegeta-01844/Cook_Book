// Ensure all script execution waits until the DOM is fully loaded.
document.addEventListener('DOMContentLoaded', function() {

    // Select elements
    const bgAudio = document.getElementById('bg-audio');
    const playBtn = document.getElementById('play-btn');
    const cookBtn = document.getElementById('cook-btn');
    const homepage = document.querySelector('.homepage');

    // Element not in current HTML, but kept for context if you add it later
    const flameVideo = document.getElementById('flame-video'); 
    
    // --- Login/Modal Elements (Needed to prevent errors, even if user didn't ask for fix) ---
    const userCard = document.getElementById('userCard');
    const adminCard = document.getElementById('adminCard');
    const loginOverlay = document.getElementById('loginOverlay');
    const userChoiceModal = document.getElementById('userChoiceModal');
    const passwordModal = document.getElementById('passwordModal');
    const registerModal = document.getElementById('registerModal');
    const roleInput = document.getElementById('roleInput');
    const modalRole = document.getElementById('modalRole');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    const userSound = document.getElementById('userSound');
    const adminSound = document.getElementById('adminSound');
    const regErrorMsg = document.getElementById('regErrorMsg');
    const regPasswordInput = document.getElementById('regPasswordInput');
    const regPasswordConfirmInput = document.getElementById('regPasswordConfirmInput');

    // -------------------------------
    // Autoplay base audio on first interaction
    // -------------------------------
    const startAudio = () => {
        if (bgAudio) {
            // Attempt to play, catching the error if the browser blocks it (common behavior)
            bgAudio.play().catch(err => {
                // This console log helps diagnose why autoplay might fail
                console.log("Audio play blocked (user interaction required):", err);
            });
        }
        // Remove listeners after the first successful attempt/interaction
        window.removeEventListener('click', startAudio);
        window.removeEventListener('keydown', startAudio);
    };

    // Attach listeners globally to detect the first user interaction
    window.addEventListener('click', startAudio);
    window.addEventListener('keydown', startAudio);


    // -------------------------------
    // Navigate to pages
    // -------------------------------
    const handleButtonClick = (event, button) => {
        // Prevent the default navigation action of the <a> tag
        event.preventDefault(); 
        
        if (bgAudio) {
            // Pause background audio
            bgAudio.pause();
        }

        // Use 'href' to read the correct URL
        const targetUrl = button.getAttribute('href'); 
        
        if (targetUrl) {
            window.location.href = targetUrl;
        }
    };

    if (playBtn) {
        // Attach the click handler
        playBtn.addEventListener('click', (event) => handleButtonClick(event, playBtn));
    }
    
    if (cookBtn) {
        // Attach the click handler
        cookBtn.addEventListener('click', (event) => handleButtonClick(event, cookBtn));
    }


   // -------------------------------
   // Hover slide backgrounds (Kept as is)
   // -------------------------------
   if (homepage) {
        if (playBtn) {
            // Play Button Hover Logic
            playBtn.addEventListener('mouseenter', () => {
                // Remove the cook class first to ensure smooth transition
                homepage.classList.remove('slide-right-bg'); 
                homepage.classList.add('slide-left-bg');
            });
            playBtn.addEventListener('mouseleave', () => {
                homepage.classList.remove('slide-left-bg');
            });
        }

        if (cookBtn) {
            // Cook Button Hover Logic
            cookBtn.addEventListener('mouseenter', () => {
                // Remove the play class first to ensure smooth transition
                homepage.classList.remove('slide-left-bg'); 
                homepage.classList.add('slide-right-bg');
            });
            cookBtn.addEventListener('mouseleave', () => {
                homepage.classList.remove('slide-right-bg');
            });
        }
   }


    // -------------------------------
    // Skip intro flame video (Kept logic as is)
    // -------------------------------
    const skipIntro = (event) => {
        if (event.key === "d" || event.key === "ArrowRight") {
            if (!flameVideo) return;
            try {
                // Ensure the element is actually present and visible before trying to manipulate it
                const isVisible = window.getComputedStyle(flameVideo).display !== "none";
                if (isVisible) {
                    flameVideo.pause();
                    flameVideo.style.display = "none";
                }
            } catch (e) {
                console.warn("Error skipping intro video:", e);
            }
        }
    };

    window.addEventListener('keydown', skipIntro);


    // -------------------------------
    // NEW: Universal Mute Toggle on 'M' Key Press
    // -------------------------------
    window.addEventListener('keydown', (event) => {
        // Check for 'm' or 'M' key press
        if (event.key === 'm' || event.key === 'M') {
            let isMuted = false;
            
            // 1. Handle Background Audio
            if (bgAudio) {
                bgAudio.muted = !bgAudio.muted; // Toggle mute state
                isMuted = bgAudio.muted;
            }

            // 2. Handle Intro Video Audio
            if (flameVideo) {
                flameVideo.muted = !flameVideo.muted; // Toggle mute state
                isMuted = flameVideo.muted; // Update based on video's state
            }
            
            console.log('Audio Muted:', isMuted);
        }
    });

    // -------------------------------
    // --- Login/Register Modal Logic ---
    // -------------------------------
    
    // Function to show a modal and hide the overlay
    const showModal = (modal) => {
        modal.classList.remove('hidden');
        loginOverlay.classList.remove('active');
    };

    // Function to hide a modal and show the overlay
    const hideModal = (modal) => {
        modal.classList.add('hidden');
        if (loginOverlay) loginOverlay.classList.add('active');
        // Clear inputs and errors when closing a modal
        const inputs = modal.querySelectorAll('input[type="text"], input[type="password"]');
        inputs.forEach(input => input.value = '');
        if (regErrorMsg) regErrorMsg.classList.add('hidden');
    };

    // --- Role Card Clicks ---
    if (userCard && adminCard && loginOverlay) {
        // Select Role: User
        userCard.addEventListener('click', () => {
            if (userSound) userSound.play();
            loginOverlay.classList.remove('active');
            if (userChoiceModal) userChoiceModal.classList.remove('hidden');
        });

        // Select Role: Admin
        adminCard.addEventListener('click', () => {
            if (adminSound) adminSound.play();
            if (roleInput && modalRole && passwordModal) {
                roleInput.value = 'admin';
                modalRole.textContent = 'Admin Login';
                showModal(passwordModal);
            }
        });
    }

    // --- User Choice Modal Buttons ---
    const loginChoiceBtn = document.getElementById('loginChoiceBtn');
    const registerChoiceBtn = document.getElementById('registerChoiceBtn');
    const cancelUserChoiceBtn = document.getElementById('cancelUserChoiceBtn');

    if (loginChoiceBtn && userChoiceModal && passwordModal) {
        loginChoiceBtn.addEventListener('click', () => {
            hideModal(userChoiceModal);
            if (roleInput && modalRole) {
                roleInput.value = 'user';
                modalRole.textContent = 'User Login';
                showModal(passwordModal);
            }
        });
    }
    
    if (registerChoiceBtn && userChoiceModal && registerModal) {
        registerChoiceBtn.addEventListener('click', () => {
            hideModal(userChoiceModal);
            showModal(registerModal);
        });
    }

    if (cancelUserChoiceBtn && userChoiceModal && loginOverlay) {
        cancelUserChoiceBtn.addEventListener('click', () => {
            hideModal(userChoiceModal);
            if (loginOverlay) loginOverlay.classList.add('active'); // Go back to role selection
        });
    }


    // --- Login/Register Cancel Buttons ---
    const cancelBtn = document.getElementById('cancelBtn');
    const cancelRegisterBtn = document.getElementById('cancelRegisterBtn');
    
    if (cancelBtn && passwordModal && userChoiceModal && loginOverlay) {
        cancelBtn.addEventListener('click', () => {
            hideModal(passwordModal);
            // If the user role was selected, show the user choice modal again
            if (roleInput && roleInput.value === 'user') {
                if (userChoiceModal) userChoiceModal.classList.remove('hidden');
                loginOverlay.classList.remove('active');
            } else {
                if (loginOverlay) loginOverlay.classList.add('active');
            }
            if (roleInput) roleInput.value = ''; // Clear the role
        });
    }

    if (cancelRegisterBtn && registerModal && userChoiceModal) {
        cancelRegisterBtn.addEventListener('click', () => {
            hideModal(registerModal);
            if (userChoiceModal) userChoiceModal.classList.remove('hidden');
        });
    }

    // --- Basic Client-Side Password Match Validation for Register Form ---
    if (registerForm && regPasswordInput && regPasswordConfirmInput && regErrorMsg) {
        registerForm.addEventListener('submit', (event) => {
            if (regPasswordInput.value !== regPasswordConfirmInput.value) {
                event.preventDefault(); // Stop form submission
                regErrorMsg.textContent = "Passwords do not match!";
                regErrorMsg.classList.remove('hidden');
                // Optional: Add shake animation to the error message or fields
                regErrorMsg.classList.add('error-shake');
                setTimeout(() => regErrorMsg.classList.remove('error-shake'), 800);
            } else {
                regErrorMsg.classList.add('hidden');
            }
        });
    }
});