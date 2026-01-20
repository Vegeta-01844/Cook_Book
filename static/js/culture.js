// ===================================
// BACKGROUND SLIDESHOW
// ===================================

const backgrounds = [
  '/static/pictures/Extra/Slideshow/BG8.jpg',
  '/static/pictures/Extra/Slideshow/BG3.jpg',
  '/static/pictures/Extra/Slideshow/BG11.jpg',
  '/static/pictures/Extra/Slideshow/BG9.jpg',
  '/static/pictures/Extra/Slideshow/BG14.jpg',
  '/static/pictures/Extra/Slideshow/BG5.jpg',
  '/static/pictures/Extra/Slideshow/BG10.jpg',
  '/static/pictures/Extra/Slideshow/BG6.jpg',
  '/static/pictures/Extra/Slideshow/BG12.jpg',
  '/static/pictures/Extra/Slideshow/BG2.jpg',
  '/static/pictures/Extra/Slideshow/BG4.jpg',
  '/static/pictures/Extra/Slideshow/BG15.jpg',
  '/static/pictures/Extra/Slideshow/BG13.jpg',
  '/static/pictures/Extra/Slideshow/BG1.jpg',
  '/static/pictures/Extra/Slideshow/BG7.jpg',
];

const slideshow = document.getElementById('background-slideshow');
let currentIndex = 0;
let slideshowInterval = null;

// Create background slides
backgrounds.forEach((src, index) => {
  const slide = document.createElement('div');
  slide.classList.add('bg-slide');
  if (index === 0) slide.classList.add('active');
  slide.style.backgroundImage = `url(${src})`;
  slideshow.appendChild(slide);
});

const slides = document.querySelectorAll('.bg-slide');

function startSlideshow() {
  if (slideshowInterval) return;

  slideshowInterval = setInterval(() => {
    slides[currentIndex].classList.remove('active');
    currentIndex = (currentIndex + 1) % slides.length;
    slides[currentIndex].classList.add('active');
  }, 8000);
}

function stopSlideshow() {
  clearInterval(slideshowInterval);
  slideshowInterval = null;
}

startSlideshow();

// ===================================
// JSON-DRIVEN CULTURE CONTENT
// ===================================

const creditsContent = document.getElementById('credits-content');
const foodImage = document.getElementById('food-image');

let scrollDuration = 140; // default animation duration in seconds

// Fetch JSON data
fetch('/static/data/history/sample.json')
  .then(response => response.json())
  .then(data => {
    buildCredits(data);
    observeScenes();
    updateCreditsSpeed();
  })
  .catch(err => console.error('Culture JSON load error:', err));

// Build credit scenes dynamically
function buildCredits(dishes) {
  creditsContent.innerHTML = '';

  dishes.forEach((dish, index) => {
    const scene = document.createElement('div');
    scene.className = 'credit-scene';
    scene.dataset.img = dish.image;

    const title = document.createElement('h2');
    title.textContent = dish.title;
    scene.appendChild(title);

    dish.lines.forEach(line => {
      const p = document.createElement('p');
      p.textContent = line;
      scene.appendChild(p);
    });

    creditsContent.appendChild(scene);

    if (index === 0) {
      foodImage.src = dish.image;
    }
  });

  // Final card
  const endScene = document.createElement('div');
  endScene.className = 'credit-scene end-scene';
  endScene.innerHTML = `
    <h2>Culture Lives On</h2>
    <p>Through what we cook</p>
    <p>Through what we share</p>
  `;
  creditsContent.appendChild(endScene);
}

// ===================================
// IMAGE SYNC WITH SCROLL
// ===================================

function observeScenes() {
  const scenes = document.querySelectorAll('.credit-scene');

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.target.dataset.img) {
          switchFoodImage(entry.target.dataset.img);
        }
      });
    },
    {
      root: document.getElementById('credits-window'),
      threshold: 0.6
    }
  );

  scenes.forEach(scene => observer.observe(scene));
}

function switchFoodImage(src) {
  foodImage.classList.remove('active');
  setTimeout(() => {
    foodImage.src = src;
    foodImage.classList.add('active');
  }, 300);
}

// ===================================
// PAUSE SLIDESHOW ON CREDITS HOVER
// ===================================

const creditsWindow = document.getElementById('credits-window');

creditsWindow.addEventListener('mouseenter', stopSlideshow);
creditsWindow.addEventListener('mouseleave', startSlideshow);

// ===================================
// AMBIENT AUDIO
// ===================================

const audio = document.getElementById('culture-audio');

document.addEventListener(
  'click',
  () => {
    if (audio.paused) {
      audio.volume = 0.3;
      audio.play();
    }
  },
  { once: true }
);

// ===================================
// CREDITS SPEED CONTROL (LEFT/RIGHT ARROW)
// ===================================

function updateCreditsSpeed() {
  creditsContent.style.animationDuration = `${scrollDuration}s`;
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') {
    scrollDuration = Math.max(20, scrollDuration - 10); // speed up, min 20s
    updateCreditsSpeed();
  } else if (e.key === 'ArrowLeft') {
    scrollDuration += 10; // slow down
    updateCreditsSpeed();
  }
});
