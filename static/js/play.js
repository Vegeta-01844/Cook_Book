/***********************************************************
 * HELPER: SHUFFLE ARRAY
 ***********************************************************/
function shuffleArray(array) {
    return array.sort(() => Math.random() - 0.5);
}

/***********************************************************
 * HELPER: GET CURRENT RECIPE
 ***********************************************************/
function getCurrentRecipe(state) {
    return state.recipes[state.currentIndex] || null;
}

// Helper to avoid repeating code
    function handleGameSubmission() {
        const guess = guessInput.value.trim();
        if (!guess) return;
        submitGuess(guess);
        guessInput.value = '';
    }

/***********************************************************
 * INTRO VIDEO + AUDIO
 ***********************************************************/
document.addEventListener('DOMContentLoaded', () => {
    const playAudio = document.getElementById('play-audio');
    const playVideo = document.getElementById('play-video');
    let videoEnded = false;

    if (playVideo) {
        playVideo.style.display = 'block';
        playVideo.currentTime = 0;
        playVideo.play().catch(() => {});
        playVideo.onended = handleVideoEnd;
        setTimeout(() => { if (!videoEnded) handleVideoEnd(); }, 11000);
    }

    document.addEventListener('keydown', e => {
        const key = e.key.toLowerCase();
        if (key === 'arrowright' && playVideo && !videoEnded) handleVideoEnd();
    });

    initGameModule();

    function handleVideoEnd() {
        if (videoEnded) return;
        videoEnded = true;
        if (playVideo) { playVideo.pause(); playVideo.style.display = 'none'; }
        if (playAudio) { playAudio.currentTime = 0; playAudio.play().catch(()=>{}); }
        showInstructions();
    }
});

function showInstructions() {
    const overlay = document.getElementById('instruction-overlay');
    if (overlay) overlay.classList.remove('hidden');
}

/***********************************************************
 * GAME MODULE
 ***********************************************************/
function initGameModule() {
    const submitBtn = document.getElementById('submit-guess-btn');
    const guessInput = document.getElementById('guess-input');
    const hintCard = document.getElementById('hint-card');
    const startBtn = document.getElementById('start-game-btn');
    const hintSection = document.getElementById('hint-section');
    const wordGrid = document.getElementById('word-grid-container');
    const inputSection = document.getElementById('guess-input-section');
    const playAgainBtn = document.getElementById('play-again-btn');

    let gameState = {
        totalPoints: 0,       // accumulated points
        currentPoints: 0,     // points for current recipe
        lives: 3,
        attemptNumber: 1,
        hintUsed: false,
        recipes: [],
        currentIndex: 0,
        correctCount: 0       // counter for correct guesses
    };

    // Load recipes JSON and shuffle
    fetch('/static/data/game_data.json')
        .then(res => res.ok ? res.json() : null)
        .then(data => {
            if (data && data.rounds) {
                gameState.recipes = shuffleArray(
                    data.rounds.flatMap(r => r.words)
                );
                const counterEl = document.getElementById('correct-counter');
                if (counterEl) counterEl.textContent = `0 / ${gameState.recipes.length}`;
            }
        });


        /********************
 * ENTER KEY SUBMIT
 ********************/
guessInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault(); // prevents form reload if inside a <form>
        const guess = guessInput.value.trim();
        if (!guess) return;
        submitGuess(guess);
        guessInput.value = '';
    }
});
    

    /********************
     * START GAME
     ********************/
    startBtn?.addEventListener('click', () => {
        document.getElementById('instruction-overlay')?.classList.add('hidden');
        if (hintSection) hintSection.style.display = 'block';
        if (wordGrid) wordGrid.style.display = 'flex';
        if (inputSection) inputSection.style.display = 'flex';
        loadRecipeState();
    });

    /********************
     * SUBMIT GUESS
     ********************/
    submitBtn?.addEventListener('click', () => {
        const guess = guessInput.value.trim();
        if (!guess) return;
        submitGuess(guess);
        guessInput.value = '';
    });
    /********************
     * HINT
     ********************/
    hintCard?.addEventListener('click', () => {
        if (gameState.hintUsed) return;
        gameState.hintUsed = true;
        gameState.currentPoints = Math.max(0, gameState.currentPoints - 2);
        hintCard.classList.add('flipped');
        showHint();
        updateHUD();
    });
    

    /********************
     * PLAY AGAIN
     ********************/
    playAgainBtn?.addEventListener('click', () => {
        resetGame();
        loadRecipeState();
    });

    /********************
     * LOAD RECIPE STATE
     ********************/
    function loadRecipeState() {
        const recipe = getCurrentRecipe(gameState);
        if (!recipe) {
            // Game finished
            showResult("completed");
            return;
        }
        resetRecipeState();
        // FIXED: pass correct partial_letters
        generateGrid(recipe.dish_name, recipe.partial_letters || []);
        showHint();
        updateHUD();
    }

    /********************
     * RESET PER-RECIPE STATE
     ********************/
    function resetRecipeState() {
        gameState.lives = 3;
        gameState.attemptNumber = 1;
        gameState.hintUsed = false;
        gameState.currentPoints = 0;

        const hintImage = document.getElementById('hint-image');
        if (hintImage) hintImage.src = "";

        if (hintCard) hintCard.classList.remove('flipped');

        const row = document.querySelector('.word-row');
        if (row) row.innerHTML = "";
    }

    /********************
     * RESET ENTIRE GAME
     ********************/
    function resetGame() {
        gameState.totalPoints = 0;
        gameState.currentIndex = 0;
        gameState.correctCount = 0;
        gameState.recipes = shuffleArray(gameState.recipes);
        updateHUD();
        updateCounter();
        hideResultModal();
    }

    /********************
     * SUBMIT GUESS LOGIC
     ********************/
    function submitGuess(guess) {
        const recipe = getCurrentRecipe(gameState);
        if (!recipe) return;

        const correct = recipe.dish_name.toLowerCase().replace(/\s/g,"");
        const attempt = guess.toLowerCase().replace(/\s/g,"");
        const row = document.querySelector('.word-row');
        if (!row) return;

        // Wordle-style feedback
        const correctLetters = correct.split("");
        const guessLetters = attempt.split("");
        const letterCount = {};
        correctLetters.forEach(l => letterCount[l] = (letterCount[l] || 0) + 1);

        [...row.children].forEach((tile, i) => {
            const g = guessLetters[i] || "";
            const c = correctLetters[i] || "";
            tile.textContent = g.toUpperCase();
            tile.className = "tile";

            if (!g) return;
            if (g === c) {
                tile.classList.add("correct");
                letterCount[g]--;
            } else if (letterCount[g] > 0) {
                tile.classList.add("present");
                letterCount[g]--;
            } else {
                tile.classList.add("absent");
            }
        });

        // Check win
        if (attempt === correct) {
            const points = calculatePoints();
            gameState.currentPoints = points;
            gameState.totalPoints += points;
            gameState.correctCount++;
            updateHUD();
            updateCounter();
            setTimeout(advanceRecipe, 1000);
            return;
        }

        // Wrong attempt
        gameState.lives--;
        gameState.attemptNumber++;
        updateHUD();

        if (gameState.lives <= 0) {
            gameState.currentPoints = 0;
            showResult("lost", recipe.dish_name);
        }
    }

    /********************
     * POINT CALCULATION
     ********************/
    function calculatePoints() {
        const base = {1:10, 2:5, 3:3}[gameState.attemptNumber] || 0;
        return Math.max(0, base - (gameState.hintUsed ? 2 : 0));
    }

    /********************
     * ADVANCE TO NEXT RECIPE
     ********************/
    function advanceRecipe() {
        gameState.currentIndex++;
        if (gameState.currentIndex >= gameState.recipes.length) {
            showResult("completed");
            return;
        }
        loadRecipeState();
    }

    /********************
     * GRID GENERATION
     ********************/
    function generateGrid(word, partialLetters = []) {
        const container = document.getElementById('word-grid-container');
        if (!container) return;
        container.innerHTML = "";
        const row = document.createElement('div');
        row.className = "word-row";

        word.replace(/\s/g,"").split("").forEach((_, i) => {
            const tile = document.createElement('div');
            tile.className = "tile";
            tile.textContent = partialLetters[i] || "";
            if (tile.textContent) tile.classList.add("present");
            row.appendChild(tile);
        });
        container.appendChild(row);
    }

    /********************
     * SHOW HINT
     ********************/
    function showHint() {
        const recipe = getCurrentRecipe(gameState);
        const hintImage = document.getElementById('hint-image');
        if (recipe?.hint_image && hintImage) hintImage.src = recipe.hint_image;
    }

    /********************
     * UPDATE HUD
     ********************/
    function updateHUD() {
        const pointsEl = document.getElementById('points-value');
        if (pointsEl) pointsEl.textContent = gameState.totalPoints;

        const hearts = document.getElementById('player-hearts');
        if (!hearts) return;
        hearts.innerHTML = "";
        for (let i=0;i<3;i++){
            const h = document.createElement('div');
            h.className = "life-icon" + (i >= gameState.lives ? " lost" : "");
            hearts.appendChild(h);
        }
    }

    /********************
     * UPDATE CORRECT COUNTER
     ********************/
    function updateCounter() {
        const counterEl = document.getElementById('correct-counter');
        if (counterEl) counterEl.textContent = `${gameState.correctCount} / ${gameState.recipes.length}`;
    }

    /********************
     * RESULT MODAL
     ********************/
    function showResult(status, dish="") {
        const modal = document.getElementById('game-result-modal');
        if (!modal) return;

        const title = document.getElementById('result-title');
        const msg = document.getElementById('result-message');

        if (title) title.textContent =
            status === "completed" ? `Your Score: ${gameState.totalPoints}` :
            status === "lost" ? "Game Over" : "You Won!";

        if (msg) msg.textContent = status === "lost" ? `Correct dish: ${dish}` : "";

        modal.classList.remove('hidden');
    }

    function hideResultModal() {
        const modal = document.getElementById('game-result-modal');
        if (modal) modal.classList.add('hidden');
    }
}
