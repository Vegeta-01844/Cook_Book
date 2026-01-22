document.addEventListener('DOMContentLoaded', () => {
    const cookAudio = document.getElementById('cook-audio');
    const flameVideo = document.getElementById('flame-video');
    const cookingMenu = document.getElementById('cooking-menu');

    // --- Decide whether to skip the intro ---
    // Only play intro if coming from homepage after clicking "play"
    const cameFromHome = sessionStorage.getItem('fromHome') === 'true';
    const skipIntro = sessionStorage.getItem('skipIntro') === 'true';

    // If coming from homepage (clicking play button), show intro
    if (cameFromHome) {
        sessionStorage.removeItem('fromHome'); // reset flag after first use
        flameVideo.style.display = 'block';
        flameVideo.currentTime = 0;
        flameVideo.play().catch(err => console.log("Video blocked:", err));

        flameVideo.onended = () => handleVideoTransition(flameVideo, cookingMenu, cookAudio);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight') skipVideo(flameVideo, cookingMenu, cookAudio);
            if (e.key.toLowerCase() === 'm') toggleMute(cookAudio);
        });

        setTimeout(() => { 
            if (!flameVideo.paused) skipVideo(flameVideo, cookingMenu, cookAudio); 
        }, 27000);
    } else {
        // For any other navigation, skip intro
        flameVideo.style.display = 'none';
        cookingMenu.style.display = 'block';
        playCookAudio();
        sessionStorage.setItem('skipIntro','true'); // ensure it never plays again in this session
    }

    // --- Initialize Waves ---
    initWaves();
});

// --- Audio helpers ---
function playCookAudio() {
    const cookAudio = document.getElementById('cook-audio');
    if(cookAudio){ 
        cookAudio.currentTime = 0; 
        cookAudio.play().catch(err=>console.log("Audio blocked:",err)); 
    }
}

function skipVideo(videoEl, nextEl, audioEl) { videoEl.pause(); handleVideoTransition(videoEl,nextEl,audioEl); }
function handleVideoTransition(videoEl, nextScreenEl, nextAudioEl) {
    videoEl.classList.add('fade-out');
    videoEl.addEventListener('animationend', () => {
        videoEl.style.display = 'none';
        videoEl.classList.remove('fade-out');
        if(nextScreenEl) nextScreenEl.style.display = 'block';
        if(nextAudioEl){ 
            nextAudioEl.currentTime=0; 
            nextAudioEl.play().catch(err=>console.log("Audio blocked:",err)); 
        }
    }, {once:true});
}

function toggleMute(audioEl){ audioEl.muted = !audioEl.muted; showMuteIndicator(audioEl.muted); }
function showMuteIndicator(isMuted){
    let indicator = document.getElementById('mute-indicator');
    if(!indicator){
        indicator=document.createElement('div');
        indicator.id='mute-indicator';
        indicator.style.cssText='position:fixed;bottom:40px;right:40px;padding:12px 18px;font-size:1.2rem;color:gold;background:rgba(0,0,0,0.6);border:2px solid gold;border-radius:10px;z-index:999;transition:opacity 0.5s ease;';
        document.body.appendChild(indicator);
    }
    indicator.textContent = isMuted?"🔇 Muted":"🔊 Unmuted";
    indicator.style.opacity='1';
    setTimeout(()=>{indicator.style.opacity='0';},1200);
}

// -------------------------------
// Waves & Floating Ingredients + Boat
// -------------------------------
function initWaves() {
    const canvas = document.getElementById('wave-canvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');

    function resizeCanvas(){
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const boatImgSrc = '/static/pictures/ingredients/Boat.png';
    const loadedIngredients = [];

    const boat = new Image();
    boat.src = boatImgSrc;
    boat.loaded = false;
    boat.onload = () => boat.loaded = true;
    boat.onerror = () => console.warn("Boat image failed:", boatImgSrc);

    const particles = [];
    const particleCount = 20;
    for(let i=0;i<particleCount;i++){
        particles.push({
            img: null,
            x: Math.random()*canvas.width,
            y: Math.random()*canvas.height,
            speed: 0.3 + Math.random()*0.7,
            amplitude: 20 + Math.random()*15,
            angle: Math.random()*Math.PI*2,
            size: 30 + Math.random()*15
        });
    }

    let boatProgress = 0;

    function animate(){
        ctx.clearRect(0,0,canvas.width,canvas.height);
        const time = Date.now()*0.002;

        ctx.beginPath();
        ctx.moveTo(0,canvas.height/2);
        for(let x=0;x<canvas.width;x++){
            ctx.lineTo(x, canvas.height/2 + Math.sin(x*0.01 + time)*15 + Math.sin(x*0.02 + time*0.5)*10);
        }
        ctx.lineTo(canvas.width,canvas.height);
        ctx.lineTo(0,canvas.height);
        ctx.closePath();

        const waveGradient = ctx.createLinearGradient(0, canvas.height/2 - 30, 0, canvas.height);
        waveGradient.addColorStop(0, 'rgba(0,50,100,0.6)');
        waveGradient.addColorStop(1, 'rgba(0,20,40,0.9)');
        ctx.fillStyle = waveGradient;
        ctx.fill();

        particles.forEach(p=>{
            if(!p.img && loadedIngredients.length>0){
                p.img = loadedIngredients[Math.floor(Math.random()*loadedIngredients.length)];
            }
            if(p.img){
                p.y += p.speed;
                if(p.y > canvas.height) p.y = -p.size;
                const waveOffset = Math.sin(p.x*0.01 + time)*p.amplitude;
                ctx.drawImage(p.img, p.x, p.y + waveOffset, p.size, p.size);
            }
        });

        if(boat.loaded){
            const boatX = boatProgress % canvas.width;
            const waveY = canvas.height/2;
            const boatWaveY = waveY + Math.sin(boatX*0.01 + time)*15 + Math.sin(boatX*0.02 + time*0.5)*10;

            const desiredBoatWidth = 120;
            const aspectRatio = boat.naturalHeight / boat.naturalWidth;
            const boatHeight = desiredBoatWidth * aspectRatio;

            ctx.drawImage(boat, boatX - desiredBoatWidth/2, boatWaveY - boatHeight/2, desiredBoatWidth, boatHeight);
            boatProgress += 1;
        }

        requestAnimationFrame(animate);
    }
    animate();
}

document.body.style.overflow = 'auto';
