document.addEventListener('DOMContentLoaded', function() {
    const firefliesContainer = document.getElementById('fireflies');
    if (!firefliesContainer) return;

    const fireflyCount = 20;

    for (let i = 0; i < fireflyCount; i++) {
        const firefly = document.createElement('div');
        firefly.className = 'firefly';
        
        firefly.style.left = `${Math.random() * 100}%`;
        firefly.style.top = `${Math.random() * 100}%`;
        firefly.style.animationDuration = `${Math.random() * 5 + 5}s`;
        firefly.style.animationDelay = `${Math.random() * 5}s`;
        
        firefliesContainer.appendChild(firefly);
    }
});