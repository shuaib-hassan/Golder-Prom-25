// gallery.js
document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('upload-form');
    const galleryGrid = document.getElementById('gallery-grid');

    // Load gallery images
    loadGallery();

    // Handle image upload
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleImageUpload);
    }

    // Auto-refresh gallery every 30 seconds for real-time updates
    setInterval(loadGallery, 30000);
});

// Load gallery images from backend
async function loadGallery() {
    try {
        const response = await fetch('/api/gallery');
        if (!response.ok) {
            throw new Error('Failed to load gallery');
        }
        
        const images = await response.json();
        displayGallery(images);
    } catch (error) {
        console.error('Error loading gallery:', error);
        displayGalleryError();
    }
}

// Display gallery images
function displayGallery(images) {
    const galleryGrid = document.getElementById('gallery-grid');
    
    if (!galleryGrid) return;

    if (images.length === 0) {
        galleryGrid.innerHTML = `
            <div class="no-images">
                <i class="fas fa-images"></i>
                <p>No photos uploaded yet. Be the first to share a memory!</p>
            </div>
        `;
        return;
    }

    let html = '';
    images.forEach(image => {
        html += createImageCard(image);
    });
    
    galleryGrid.innerHTML = html;

    // Add event listeners for like buttons
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', handleLike);
    });

    // Add event listeners for delete buttons (admin only)
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', handleDelete);
    });
}

// Create image card HTML
function createImageCard(image) {
    const isAdmin = checkIfAdmin(); // You can implement this function based on your admin system
    
    return `
        <div class="gallery-item" data-id="${image.id}">
            <div class="image-container">
                <img src="${image.path}" alt="${image.title}" onerror="this.src='assets/images/placeholder.jpg'">
                <div class="image-overlay">
                    <div class="image-actions">
                        <button class="like-btn" data-id="${image.id}">
                            <i class="fas fa-heart"></i>
                            <span class="like-count">${image.likes || 0}</span>
                        </button>
                        ${isAdmin ? `
                            <button class="delete-btn" data-id="${image.id}" title="Delete Image">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
            <div class="image-info">
                <h4>${image.title}</h4>
                ${image.description ? `<p>${image.description}</p>` : ''}
                <div class="image-meta">
                    <span class="uploader">By: ${image.uploadedBy}</span>
                    <span class="upload-date">${formatDate(image.uploadedAt)}</span>
                </div>
            </div>
        </div>
    `;
}

// Handle image upload
async function handleImageUpload(e) {
    e.preventDefault();
    
    const formData = new FormData();
    const imageFile = document.getElementById('image-file').files[0];
    const title = document.getElementById('image-title').value.trim();
    const description = document.getElementById('image-description').value.trim();
    const uploadedBy = document.getElementById('uploader-name').value.trim();

    if (!imageFile) {
        showMessage('Please select an image file', 'error');
        return;
    }

    formData.append('image', imageFile);
    if (title) formData.append('title', title);
    if (description) formData.append('description', description);
    if (uploadedBy) formData.append('uploadedBy', uploadedBy);

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';

        const response = await fetch('/api/gallery/upload', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Upload failed');
        }

        showMessage('Image uploaded successfully!', 'success');
        e.target.reset();
        
        // Reload gallery to show new image
        loadGallery();
    } catch (error) {
        console.error('Upload error:', error);
        showMessage(error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// Handle like button click
async function handleLike(e) {
    const imageId = e.currentTarget.dataset.id;
    const likeBtn = e.currentTarget;
    const likeCount = likeBtn.querySelector('.like-count');
    
    try {
        const response = await fetch(`/api/gallery/${imageId}/like`, {
            method: 'POST'
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Failed to like image');
        }

        // Update like count
        likeCount.textContent = result.likes;
        
        // Add visual feedback
        likeBtn.classList.add('liked');
        setTimeout(() => likeBtn.classList.remove('liked'), 1000);
    } catch (error) {
        console.error('Error liking image:', error);
        showMessage('Failed to like image', 'error');
    }
}

// Handle delete button click (admin only)
async function handleDelete(e) {
    const imageId = e.currentTarget.dataset.id;
    
    if (!confirm('Are you sure you want to delete this image?')) {
        return;
    }

    try {
        const response = await fetch(`/api/gallery/${imageId}`, {
            method: 'DELETE'
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Failed to delete image');
        }

        showMessage('Image deleted successfully', 'success');
        loadGallery(); // Reload gallery
    } catch (error) {
        console.error('Error deleting image:', error);
        showMessage('Failed to delete image', 'error');
    }
}

// Display gallery error
function displayGalleryError() {
    const galleryGrid = document.getElementById('gallery-grid');
    if (galleryGrid) {
        galleryGrid.innerHTML = `
            <div class="gallery-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load gallery. Please try again later.</p>
            </div>
        `;
    }
}

// Check if user is admin (you can implement this based on your admin system)
function checkIfAdmin() {
    // For now, return false. You can implement proper admin checking
    // based on your authentication system
    return false;
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Show message
function showMessage(message, type) {
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    // Add to page
    document.body.appendChild(messageDiv);
    
    // Remove after 3 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
} 