// assets/js/sparkle.js
document.addEventListener('DOMContentLoaded', function() {
    const sparkleContainer = document.createElement('div');
    sparkleContainer.className = 'sparkle-container';
    document.body.appendChild(sparkleContainer);

    // Create sparkles based on viewport size
    function createSparkles() {
        const sparkleCount = Math.floor(window.innerWidth / 10);
        sparkleContainer.innerHTML = '';

        for (let i = 0; i < sparkleCount; i++) {
            const sparkle = document.createElement('div');
            sparkle.className = 'sparkle';
            
            // Random positioning
            sparkle.style.left = `${Math.random() * 100}%`;
            sparkle.style.top = `${Math.random() * 100}%`;
            
            // Random size between 2px and 6px
            const size = Math.random() * 4 + 2;
            sparkle.style.width = `${size}px`;
            sparkle.style.height = `${size}px`;
            
            // Random animation duration (3-8 seconds)
            sparkle.style.animationDuration = `${Math.random() * 5 + 3}s`;
            
            // Random delay (0-5 seconds)
            sparkle.style.animationDelay = `${Math.random() * 5}s`;
            
            // Random opacity
            sparkle.style.opacity = Math.random() * 0.7 + 0.3;
            
            // Add to container
            sparkleContainer.appendChild(sparkle);
        }
    }

    // Initialize and recreate on resize
    createSparkles();
    window.addEventListener('resize', createSparkles);
});