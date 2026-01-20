// static/js/login.js — FINALIZED & Optimized for Strict Browser Audio Policy

document.addEventListener("DOMContentLoaded", () => {
    // --- Element Selection ---
    const overlay = document.getElementById("loginOverlay");
    const passwordModal = document.getElementById("passwordModal"); // Login Modal
    const userChoiceModal = document.getElementById("userChoiceModal"); // New Choice Modal
    const registerModal = document.getElementById("registerModal"); // New Register Modal
    
    const roleInput = document.getElementById("roleInput");
    const usernameInput = document.getElementById("usernameInput");
    const modalRole = document.getElementById("modalRole");
    
    const cancelBtn = document.getElementById("cancelBtn"); // Login Modal Cancel
    const cancelUserChoiceBtn = document.getElementById("cancelUserChoiceBtn"); // Choice Modal Cancel
    const cancelRegisterBtn = document.getElementById("cancelRegisterBtn"); // Register Modal Cancel

    const loginChoiceBtn = document.getElementById("loginChoiceBtn"); // Login button in choice modal
    const registerChoiceBtn = document.getElementById("registerChoiceBtn"); // Register button in choice modal
    const backToLoginLink = document.getElementById("backToLoginLink"); // Link in register modal
    
    const userCard = document.getElementById("userCard");
    const adminCard = document.getElementById("adminCard");
    const bgAudio = document.getElementById("bg-audio");
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm"); // New Register Form

    const regErrorMsg = document.getElementById("regErrorMsg"); // New Register Error Message

    const userSound = document.getElementById("userSound");
    const adminSound = document.getElementById("adminSound");

    const loggedIn = document.body.dataset.role;
    let originalBgVolume = 0.4; 
    let audioPlayed = false; 

    // --- Audio Priming (Crucial for silent playback fix) ---
    const startBgAudio = () => {
        if (bgAudio && !audioPlayed) {
            bgAudio.volume = originalBgVolume;
            bgAudio.play().catch(() => {});
            audioPlayed = true;
        }
        window.removeEventListener('click', startBgAudio);
        window.removeEventListener('keydown', startBgAudio);
    };

    if (!loggedIn) {
        window.addEventListener('click', startBgAudio);
        window.addEventListener('keydown', startBgAudio);
    }
    // --- Initial UI setup ---
    if (overlay && !loggedIn) {
        overlay.classList.add("active");
    } else if (overlay) {
        overlay.style.display = "none";
    }

    // --- Core Modal Functions ---
    const openLoginModal = (role) => {
        // 1. Set Role Input
        roleInput.value = role;
        
        // 2. Set Username Input (Defaulting to role name for Admin, empty for User)
        if (usernameInput) {
            usernameInput.value = (role === 'admin') ? role : '';
        }
        
        // 3. Clear Password and Update Modal Title
        const passwordInput = document.getElementById("passwordInput");
        if (passwordInput) {
            passwordInput.value = "";
        }

        modalRole.textContent = `Login as ${role.charAt(0).toUpperCase() + role.slice(1)}`;
        passwordModal.classList.remove("hidden");
        overlay.classList.add("blur");
        
        // 4. Focus on Input
        setTimeout(() => {
            const inputToFocus = (role === 'admin' && passwordInput) ? passwordInput : usernameInput;
            if (inputToFocus) {
                inputToFocus.focus();
            }
        }, 10);
    };

    const openRegisterModal = () => {
        registerModal.classList.remove("hidden");
        userChoiceModal.classList.add("hidden"); // Hide choice modal
        overlay.classList.add("blur");
        
        // Clear any previous error messages
        regErrorMsg.classList.add("hidden");
        regErrorMsg.textContent = "";

        // Focus on the new username input
        setTimeout(() => {
            const regUsernameInput = document.getElementById("regUsernameInput");
            if (regUsernameInput) {
                regUsernameInput.focus();
            }
        }, 10);
    };
    
    // Function to close any currently open modal and reset volume
    const closeModal = (modal) => {
        if (modal) {
            modal.classList.add("hidden");
        }
        overlay.classList.remove("blur");
        
        // Reset inputs on close
        document.getElementById("passwordInput").value = "";
        document.getElementById("regUsernameInput").value = "";
        document.getElementById("regPasswordInput").value = "";
        document.getElementById("regPasswordConfirmInput").value = "";
        
        if (bgAudio) {
             bgAudio.volume = originalBgVolume; 
        }
    };

    // --- Audio Ducking & Play Logic ---
    const playAvatarSound = (avatarAudio) => {
        if (!avatarAudio) return; 

        // 1. DUCK BACKGROUND AUDIO (if it's running)
        if (bgAudio && !bgAudio.paused) {
             bgAudio.volume = originalBgVolume * 0.3; 
        }

        // 2. PLAY SELECTION SOUND
        avatarAudio.currentTime = 0;
        avatarAudio.play().catch((err) => {
             console.error("Failed to play selection sound. Check encoding/format:", err);
        });

        // 3. RESTORE VOLUME ONCE DONE
        avatarAudio.onended = () => {
            if (bgAudio) {
                bgAudio.volume = originalBgVolume;
            }
        };
    };

    // --- Event Listeners for Role Selection ---
    const handleCardClick = (role, avatarSound) => {
        playAvatarSound(avatarSound);
        
        if (role === 'admin') {
            openLoginModal(role);
        } else {
            // New logic for User role: show choice modal
            userChoiceModal.classList.remove("hidden");
            overlay.classList.add("blur");
        }
    };

    if (userCard) {
        userCard.addEventListener("click", () => handleCardClick('user', userSound));
    }

    if (adminCard) {
        adminCard.addEventListener("click", () => handleCardClick('admin', adminSound));
    }

    // --- New Choice Modal Listeners ---
    if (loginChoiceBtn) {
        loginChoiceBtn.addEventListener("click", () => {
            userChoiceModal.classList.add("hidden");
            openLoginModal('user');
        });
    }
    
    if (registerChoiceBtn) {
        registerChoiceBtn.addEventListener("click", openRegisterModal);
    }
    
    if (cancelUserChoiceBtn) {
        cancelUserChoiceBtn.addEventListener("click", () => closeModal(userChoiceModal));
    }

    // --- Register Modal Listeners ---
    if (cancelRegisterBtn) {
        cancelRegisterBtn.addEventListener("click", () => closeModal(registerModal));
    }
    
    if (backToLoginLink) {
        backToLoginLink.addEventListener("click", (e) => {
            e.preventDefault();
            closeModal(registerModal);
            openLoginModal('user'); // Go back to user login
        });
    }

    // --- Existing Login Modal Listeners ---
    if (cancelBtn) cancelBtn.addEventListener("click", () => closeModal(passwordModal));

    if (loginForm) {
        loginForm.addEventListener("submit", () => {
            overlay.style.display = "none";
            passwordModal.classList.add("hidden");
        });
    }

    // --- Registration Form Submission (Client-Side Validation) ---
    if (registerForm) {
        registerForm.addEventListener("submit", (e) => {
            const p1 = document.getElementById("regPasswordInput").value;
            const p2 = document.getElementById("regPasswordConfirmInput").value;
            
            if (p1 !== p2) {
                e.preventDefault();
                regErrorMsg.textContent = "Passwords do not match!";
                regErrorMsg.classList.remove("hidden");
                // Reset password fields for security
                document.getElementById("regPasswordInput").value = "";
                document.getElementById("regPasswordConfirmInput").value = "";
            } else {
                // If client-side validation passes, allow submission to Flask
                regErrorMsg.classList.add("hidden");
            }
        });
    }

    // --- Escape Key Listener (Updated to handle all modals) ---
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (!passwordModal.classList.contains('hidden')) {
                closeModal(passwordModal);
            } else if (!userChoiceModal.classList.contains('hidden')) {
                closeModal(userChoiceModal);
            } else if (!registerModal.classList.contains('hidden')) {
                closeModal(registerModal);
            }
        }
    });
});