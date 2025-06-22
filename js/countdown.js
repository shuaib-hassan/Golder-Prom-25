// countdown.js
document.addEventListener('DOMContentLoaded', function() {
    const countdownElement = document.getElementById('countdown');
    const promDate = new Date('August 24, 2025 19:00:00').getTime();

    function updateCountdown() {
        const now = new Date().getTime();
        const distance = promDate - now;

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        countdownElement.innerHTML = `
            <div class="countdown-item">
                <span>${days}</span>
                <small>Days</small>
            </div>
            <div class="countdown-item">
                <span>${hours}</span>
                <small>Hours</small>
            </div>
            <div class="countdown-item">
                <span>${minutes}</span>
                <small>Minutes</small>
            </div>
            <div class="countdown-item">
                <span>${seconds}</span>
                <small>Seconds</small>
            </div>
        `;
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);
});