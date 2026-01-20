// static/js/banner.js

// Use a self-contained block to prevent re-declarations
(() => {
    // Only run once, even if file loaded multiple times
    if (window.__bannerScriptLoaded) return;
    window.__bannerScriptLoaded = true;

    let lastScrollY = window.scrollY;
    const banner = document.querySelector('.top-banner'); // ✅ fixed selector

    if (!banner) return; // no banner yet

    window.addEventListener('scroll', () => {
        // Hide banner when scrolling down
        if (window.scrollY > lastScrollY && window.scrollY > 80) {
            banner.classList.add('hide');
        } else {
            banner.classList.remove('hide');
        }

        // Darken banner slightly when scrolled
        if (window.scrollY > 50) {
            banner.classList.add('scrolled');
        } else {
            banner.classList.remove('scrolled');
        }

        lastScrollY = window.scrollY;
    });
})();
