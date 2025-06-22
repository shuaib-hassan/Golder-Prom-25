// js/shared.js
document.addEventListener('DOMContentLoaded', function () {
    // Set current year for the footer
    const currentYearElements = document.querySelectorAll('#current-year, #current-year-footer');
    currentYearElements.forEach(element => {
        element.textContent = new Date().getFullYear();
    });

    // Hamburger menu functionality
    const hamburger = document.querySelector('.hamburger');
    const navUl = document.querySelector('nav ul');

    if (hamburger && navUl) {
        hamburger.addEventListener('click', () => {
            navUl.classList.toggle('active');
            hamburger.classList.toggle('active');
        });

        // Close hamburger menu when a link is clicked (for single-page navigation or on mobile)
        navUl.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navUl.classList.remove('active');
                hamburger.classList.remove('active');
            });
        });
    }
});