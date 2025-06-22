// Animated Sparkles/Confetti for Modern Prom Theme
class SparkleAnimation {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.sparkles = [];
        this.animationId = null;
        this.init();
    }

    init() {
        // Create canvas for sparkles
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'animated-bg';
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '0';
        
        document.body.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        
        this.resizeCanvas();
        this.createSparkles();
        this.animate();
        
        // Handle window resize
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    createSparkles() {
        const sparkleCount = Math.min(50, Math.floor(window.innerWidth / 20));
        
        for (let i = 0; i < sparkleCount; i++) {
            this.sparkles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 3 + 1,
                speedX: (Math.random() - 0.5) * 0.5,
                speedY: (Math.random() - 0.5) * 0.5,
                opacity: Math.random() * 0.8 + 0.2,
                color: this.getRandomSparkleColor(),
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.02
            });
        }
    }

    getRandomSparkleColor() {
        const colors = [
            '#ffd700', // Gold
            '#ffb300', // Orange
            '#ff6b9d', // Pink
            '#4ecdc4', // Turquoise
            '#45b7d1', // Blue
            '#96ceb4', // Mint
            '#feca57', // Yellow
            '#ff9ff3'  // Light Pink
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    drawSparkle(sparkle) {
        this.ctx.save();
        this.ctx.translate(sparkle.x, sparkle.y);
        this.ctx.rotate(sparkle.rotation);
        this.ctx.globalAlpha = sparkle.opacity;
        
        // Draw star shape
        this.ctx.fillStyle = sparkle.color;
        this.ctx.beginPath();
        
        for (let i = 0; i < 5; i++) {
            const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
            const x = Math.cos(angle) * sparkle.size;
            const y = Math.sin(angle) * sparkle.size;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
            
            const innerAngle = angle + Math.PI / 5;
            const innerX = Math.cos(innerAngle) * (sparkle.size * 0.5);
            const innerY = Math.sin(innerAngle) * (sparkle.size * 0.5);
            this.ctx.lineTo(innerX, innerY);
        }
        
        this.ctx.closePath();
        this.ctx.fill();
        
        // Add glow effect
        this.ctx.shadowColor = sparkle.color;
        this.ctx.shadowBlur = sparkle.size * 2;
        this.ctx.fill();
        
        this.ctx.restore();
    }

    updateSparkles() {
        this.sparkles.forEach(sparkle => {
            // Update position
            sparkle.x += sparkle.speedX;
            sparkle.y += sparkle.speedY;
            sparkle.rotation += sparkle.rotationSpeed;
            
            // Wrap around edges
            if (sparkle.x < -10) sparkle.x = this.canvas.width + 10;
            if (sparkle.x > this.canvas.width + 10) sparkle.x = -10;
            if (sparkle.y < -10) sparkle.y = this.canvas.height + 10;
            if (sparkle.y > this.canvas.height + 10) sparkle.y = -10;
            
            // Subtle opacity animation
            sparkle.opacity += (Math.random() - 0.5) * 0.01;
            sparkle.opacity = Math.max(0.1, Math.min(1, sparkle.opacity));
        });
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.updateSparkles();
        this.sparkles.forEach(sparkle => this.drawSparkle(sparkle));
        
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }
}

// Initialize sparkles when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only create sparkles if not already present
    if (!document.querySelector('.animated-bg canvas')) {
        window.sparkleAnimation = new SparkleAnimation();
    }
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (window.sparkleAnimation) {
        window.sparkleAnimation.destroy();
    }
}); 