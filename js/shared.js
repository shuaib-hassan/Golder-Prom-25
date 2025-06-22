// js/shared.js
document.addEventListener('DOMContentLoaded', function () {
    // Set current year for the footer
    const currentYearElements = document.querySelectorAll('#current-year, #current-year-footer');
    currentYearElements.forEach(element => {
        element.textContent = new Date().getFullYear();
    });

    // Hamburger menu functionality with improved mobile support
    const hamburger = document.querySelector('.hamburger');
    const navUl = document.querySelector('nav ul');
    const body = document.body;

    if (hamburger && navUl) {
        hamburger.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            navUl.classList.toggle('active');
            hamburger.classList.toggle('active');
            
            // Prevent body scroll when menu is open
            if (navUl.classList.contains('active')) {
                body.style.overflow = 'hidden';
            } else {
                body.style.overflow = '';
    }
        });

        // Close hamburger menu when a link is clicked
    navUl.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navUl.classList.remove('active');
            hamburger.classList.remove('active');
                body.style.overflow = '';
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!hamburger.contains(e.target) && !navUl.contains(e.target)) {
                navUl.classList.remove('active');
                hamburger.classList.remove('active');
                body.style.overflow = '';
            }
        });

        // Handle touch events for better mobile experience
        let touchStartY = 0;
        let touchEndY = 0;

        document.addEventListener('touchstart', (e) => {
            touchStartY = e.changedTouches[0].screenY;
        });

        document.addEventListener('touchend', (e) => {
            touchEndY = e.changedTouches[0].screenY;
            handleSwipe();
        });

        function handleSwipe() {
            const swipeThreshold = 50;
            const swipeDistance = touchStartY - touchEndY;
            
            // Swipe up to close menu
            if (swipeDistance > swipeThreshold && navUl.classList.contains('active')) {
                navUl.classList.remove('active');
                hamburger.classList.remove('active');
                body.style.overflow = '';
            }
        }
    }

    // Add touch-friendly improvements for buttons and interactive elements
    const interactiveElements = document.querySelectorAll('button, .btn-glow, .btn-transparent, .btn-gold, a');
    
    interactiveElements.forEach(element => {
        // Add touch feedback
        element.addEventListener('touchstart', function() {
            this.style.transform = 'scale(0.95)';
        });
        
        element.addEventListener('touchend', function() {
            this.style.transform = '';
        });
        
        // Prevent double-tap zoom on buttons
        element.addEventListener('touchend', function(e) {
            e.preventDefault();
            this.click();
        });
    });

    // Improve form inputs for mobile
    const formInputs = document.querySelectorAll('input, textarea, select');
    formInputs.forEach(input => {
        // Prevent zoom on focus for iOS
        input.addEventListener('focus', function() {
            if (window.innerWidth <= 768) {
                this.style.fontSize = '16px';
            }
        });
        
        input.addEventListener('blur', function() {
            if (window.innerWidth <= 768) {
                this.style.fontSize = '';
            }
        });
    });
});