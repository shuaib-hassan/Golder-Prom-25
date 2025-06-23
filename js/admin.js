document.addEventListener('DOMContentLoaded', function() {
    // Check authentication first
    if (!isLoggedIn()) {
        window.location.href = 'admin-login.html';
        return;
    }
    
    // Initialize admin panel
    loadCandidates();
    loadVenue();
    loadStatistics();
    
    // Candidate form handling
    const candidateForm = document.getElementById('candidate-form');
    if (candidateForm) {
        candidateForm.addEventListener('submit', handleAddCandidate);
    }

    // Venue form handling
    const venueForm = document.getElementById('venue-form');
    if (venueForm) {
        venueForm.addEventListener('submit', handleVenueUpdate);
    }
    
    // Announcement form handling
    const announcementForm = document.getElementById('announcement-form');
    if (announcementForm) {
        announcementForm.addEventListener('submit', handleAnnouncementCreate);
    }
    
    // Gallery image selector
    const selectFromGalleryBtn = document.getElementById('select-from-gallery');
    if (selectFromGalleryBtn) {
        console.log('Gallery button found, adding event listener');
        selectFromGalleryBtn.addEventListener('click', function(e) {
            console.log('Gallery button clicked!');
            e.preventDefault();
            openGalleryModal();
        });
    } else {
        console.error('Gallery button not found!');
    }

    // Modal close button
    const closeModalBtn = document.querySelector('.close-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeGalleryModal);
    }

    // Close modal when clicking outside
    const modal = document.getElementById('gallery-modal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeGalleryModal();
            }
        });
    }
    
    // Add logout button to header
    addLogoutButton();
    
    // Display current user
    displayCurrentUser();

    // Start real-time vote tracking
    startVoteTracking();
    
    // Load announcements
    loadAnnouncements();

    const candidateImageInput = document.getElementById('candidate-image');
    if (candidateImageInput) {
        candidateImageInput.addEventListener('input', updateImagePreview);
        candidateImageInput.addEventListener('change', updateImagePreview);
    }

    // Add device file selection functionality
    const selectFromDeviceBtn = document.getElementById('select-from-device');
    const deviceImageInput = document.getElementById('device-image-input');
    
    if (selectFromDeviceBtn && deviceImageInput) {
        selectFromDeviceBtn.addEventListener('click', () => {
            deviceImageInput.click();
        });
        
        deviceImageInput.addEventListener('change', handleDeviceImageSelection);
    }
});

// Check if user is logged in (same function as in admin-login.js)
function isLoggedIn() {
    const session = JSON.parse(localStorage.getItem('adminSession') || '{}');
    
    if (!session.loggedIn) return false;
    
    // Check if session is not expired (24 hours)
    const sessionTime = new Date(session.timestamp);
    const now = new Date();
    const hoursDiff = (now - sessionTime) / (1000 * 60 * 60);
    
    if (hoursDiff > 24) {
        // Session expired
        localStorage.removeItem('adminSession');
        return false;
    }
    
    return true;
}

// Add logout button to admin panel header
function addLogoutButton() {
    const nav = document.querySelector('nav ul');
    if (nav) {
        // Get current user info
        const session = JSON.parse(localStorage.getItem('adminSession') || '{}');
        const username = session.username || 'Admin';
        
        const logoutLi = document.createElement('li');
        logoutLi.innerHTML = `
            <a href="#" onclick="logout()" style="color: #ff6b9d;">
                <i class="fas fa-sign-out-alt"></i> Logout (${username})
            </a>
        `;
        nav.appendChild(logoutLi);
    }
}

// Logout function
function logout() {
    localStorage.removeItem('adminSession');
    window.location.href = 'admin-login.html';
}

// Handle adding new candidate
async function handleAddCandidate(e) {
    e.preventDefault();
    
    const name = document.getElementById('candidate-name').value.trim();
    const type = document.getElementById('candidate-type').value;
    const imageUrl = document.getElementById('candidate-image').value.trim();
    const instagramUsername = document.getElementById('candidate-instagram').value.trim();
    
    if (!name || !type) {
        showAlert('Please fill in all required fields', 'error');
        return;
    }
    
    // Validate Instagram username format
    if (instagramUsername && !/^[a-zA-Z0-9._]+$/.test(instagramUsername)) {
        showAlert('Instagram username can only contain letters, numbers, dots, and underscores', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/candidates', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                type,
                imageUrl: imageUrl || null,
                instagramUsername: instagramUsername || null
            })
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Failed to add candidate');
        }

        // Reset form and reload
        e.target.reset();
        updateImagePreview();
        loadCandidates();
        showAlert(`Added ${name} as ${type} candidate!`, 'success');
    } catch (error) {
        console.error('Error adding candidate:', error);
        showAlert(error.message, 'error');
    }
}

// Load and display candidates
async function loadCandidates() {
    try {
        const response = await fetch('/api/candidates');
        if (!response.ok) {
            throw new Error('Failed to load candidates');
        }
        
        const candidates = await response.json();
        const candidatesList = document.getElementById('candidates-list');
        
        if (!candidatesList) return;
        
        if (candidates.length === 0) {
            candidatesList.innerHTML = '<p class="no-candidates">No candidates added yet. Add some candidates above!</p>';
            return;
        }
        
        // Group by type
        const kings = candidates.filter(c => c.type === 'king');
        const queens = candidates.filter(c => c.type === 'queen');
        
        let html = '';
        
        // Display Kings
        if (kings.length > 0) {
            html += '<div class="candidate-category"><h4><i class="fas fa-crown"></i> Prom Kings</h4>';
            html += '<div class="candidates-row">';
            kings.forEach(candidate => {
                html += createCandidateCard(candidate);
            });
            html += '</div></div>';
        }
        
        // Display Queens
        if (queens.length > 0) {
            html += '<div class="candidate-category"><h4><i class="fas fa-crown"></i> Prom Queens</h4>';
            html += '<div class="candidates-row">';
            queens.forEach(candidate => {
                html += createCandidateCard(candidate);
            });
            html += '</div></div>';
        }
        
        candidatesList.innerHTML = html;
        
        // Add event listeners for remove buttons
        document.querySelectorAll('.remove-candidate').forEach(btn => {
            btn.addEventListener('click', handleRemoveCandidate);
        });
    } catch (error) {
        console.error('Error loading candidates:', error);
        showAlert('Failed to load candidates', 'error');
    }
}

// Create candidate card HTML
function createCandidateCard(candidate) {
    const defaultImage = candidate.type === 'king' ? 
        'https://via.placeholder.com/80x80/ffd700/1a1333?text=👑' : 
        'https://via.placeholder.com/80x80/ff6b9d/1a1333?text=👑';
    
    const instagramLink = candidate.instagramUsername ? 
        `<a href="https://instagram.com/${candidate.instagramUsername}" target="_blank" class="instagram-link" title="View ${candidate.name}'s Instagram">
            <i class="fab fa-instagram"></i>
        </a>` : '';
    
    return `
        <div class="candidate-card admin-candidate" data-id="${candidate.id}">
            <img src="${candidate.imageUrl || defaultImage}" alt="${candidate.name}" class="candidate-img" onerror="this.src='${defaultImage}'">
            <div class="candidate-info">
                <h4 class="candidate-name">${candidate.name}</h4>
                <span class="candidate-type">${candidate.type === 'king' ? '👑 King' : '👑 Queen'}</span>
                ${instagramLink}
            </div>
            <div class="candidate-actions">
                <button class="btn-delete remove-candidate" data-id="${candidate.id}">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
        </div>
    `;
}

// Handle removing candidate
async function handleRemoveCandidate(e) {
    const candidateId = parseInt(e.target.closest('.remove-candidate').dataset.id);
    
    if (confirm('Are you sure you want to remove this candidate?')) {
        try {
            const response = await fetch(`/api/candidates/${candidateId}`, {
                method: 'DELETE'
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Failed to remove candidate');
            }

            loadCandidates();
            showAlert(`Removed ${result.removedCandidate.name}`, 'success');
        } catch (error) {
            console.error('Error removing candidate:', error);
            showAlert(error.message, 'error');
        }
    }
}

// Handle venue update
async function handleVenueUpdate(e) {
        e.preventDefault();
    
    const venueName = document.getElementById('venue').value.trim();
    
    if (!venueName) {
        showAlert('Please enter venue details', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/venue', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: venueName })
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Failed to update venue');
        }

        // Reset form and reload venue preview
        e.target.reset();
        loadVenue();
            showAlert('Venue updated successfully!', 'success');
        
        // Force refresh venue on other pages by triggering a custom event
        window.dispatchEvent(new CustomEvent('venueUpdated', { detail: { name: venueName } }));
    } catch (error) {
        console.error('Error updating venue:', error);
        showAlert(error.message, 'error');
    }
}

// Load venue information
async function loadVenue() {
    try {
        const response = await fetch('/api/venue');
        if (!response.ok) {
            throw new Error('Failed to load venue');
        }
        
        const venueData = await response.json();
        updateVenuePreview(venueData);
    } catch (error) {
        console.error('Error loading venue:', error);
        updateVenuePreview({ name: 'Failed to load venue' });
    }
}

function updateVenuePreview(venue) {
    const venuePreview = document.getElementById('venue-preview');
    if (venuePreview) {
        if (venue.name && venue.name !== "Venue details not set yet.") {
            venuePreview.innerHTML = `
                <h3>Current Venue:</h3>
                <p><strong>${venue.name}</strong></p>
            `;
        } else {
            venuePreview.innerHTML = `
                <h3>Current Venue:</h3>
                <p>No venue set yet</p>
            `;
        }
    }
}

// Load statistics
async function loadStatistics() {
    try {
        // Get vote statistics from backend
        const response = await fetch('/api/vote-stats');
        if (!response.ok) {
            throw new Error('Failed to load statistics');
        }
        
        const stats = await response.json();
        
        // Update statistics display
        document.getElementById('total-votes').textContent = stats.totalVotes || 0;
        
        // Calculate total candidates
        const totalCandidates = (stats.candidates.kings?.length || 0) + (stats.candidates.queens?.length || 0);
        document.getElementById('total-candidates').textContent = totalCandidates;
        
        // Days until event (assuming June 15, 2025)
        const eventDate = new Date('2025-06-15');
        const today = new Date();
        const daysUntil = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
        document.getElementById('days-until').textContent = Math.max(0, daysUntil);
        
        // Get tickets sold from backend (if available)
        try {
            const ticketsResponse = await fetch('/api/tickets');
            if (ticketsResponse.ok) {
                const tickets = await ticketsResponse.json();
                const ticketsSold = tickets.filter(t => t.paymentStatus === 'PAID').length;
                document.getElementById('tickets-sold').textContent = ticketsSold;
            }
        } catch (ticketError) {
            console.log('Tickets endpoint not available, using 0');
            document.getElementById('tickets-sold').textContent = '0';
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
        // Set default values on error
        document.getElementById('total-votes').textContent = '0';
        document.getElementById('total-candidates').textContent = '0';
        document.getElementById('tickets-sold').textContent = '0';
        document.getElementById('days-until').textContent = '0';
        }
    }

    // Show alert message
    function showAlert(message, type) {
        const alertBox = document.getElementById('admin-alert');
        if (alertBox) {
            alertBox.textContent = message;
            alertBox.className = `alert ${type}`;
            alertBox.style.display = 'block';
            
            setTimeout(() => {
                alertBox.style.display = 'none';
            }, 3000);
        } else {
            alert(message);
        }
    }

// Gallery Modal Functions
function openGalleryModal() {
    const modal = document.getElementById('gallery-modal');
    if (modal) {
        modal.classList.add('visible');
        loadGalleryForSelection();
    }
}

function closeGalleryModal() {
    const modal = document.getElementById('gallery-modal');
    if (modal) {
        modal.classList.remove('visible');
    }
}

async function loadGalleryForSelection() {
    const gallerySelector = document.getElementById('gallery-selector');
    try {
        const response = await fetch('/api/gallery');
        if (!response.ok) {
            throw new Error(`Failed to load gallery: ${response.status}`);
        }
        
        const images = await response.json();
        displayGalleryForSelection(images);
    } catch (error) {
        if (gallerySelector) {
            gallerySelector.innerHTML = `<div class="error">Failed to load gallery images: ${error.message}</div>`;
        }
    }
}

function displayGalleryForSelection(images) {
    const gallerySelector = document.getElementById('gallery-selector');
    if (!gallerySelector) return;

    if (images.length === 0) {
        gallerySelector.innerHTML = '<div class="no-images">No images in gallery yet</div>';
        return;
    }

    let html = '<div class="gallery-grid-selector">';
    images.forEach(image => {
        html += `
            <div class="gallery-item-selector" 
                 onclick="selectGalleryImage('${image.path}', '${image.title}')" 
                 style="background-image: url('${image.path}');"
                 title="Select: ${image.title}">
                <div class="image-overlay-selector">
                    <span>${image.title}</span>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    gallerySelector.innerHTML = html;
}

function selectGalleryImage(imagePath, imageTitle) {
    const imageInput = document.getElementById('candidate-image');
    if (imageInput) {
        imageInput.value = imagePath;
        updateImagePreview();
    }
    closeGalleryModal();
}

function updateImagePreview() {
    const imageInput = document.getElementById('candidate-image');
    const previewImg = document.getElementById('candidate-image-preview');
    const previewPlaceholder = document.getElementById('preview-placeholder');

    if (!imageInput || !previewImg || !previewPlaceholder) return;

    const imageUrl = imageInput.value.trim();

    if (imageUrl) {
        previewImg.src = imageUrl;
        previewImg.style.display = 'block';
        previewPlaceholder.style.display = 'none';
        previewImg.onerror = () => {
            previewImg.style.display = 'none';
            previewPlaceholder.textContent = 'Invalid Image';
            previewPlaceholder.style.display = 'block';
        };
    } else {
        previewImg.style.display = 'none';
        previewPlaceholder.textContent = 'Image Preview';
        previewPlaceholder.style.display = 'block';
    }
}

// Test functions for debugging
function testGalleryModal() {
    console.log('=== TESTING GALLERY MODAL ===');
    console.log('1. Checking if modal exists...');
    const modal = document.getElementById('gallery-modal');
    console.log('Modal element:', modal);
    
    if (modal) {
        console.log('2. Modal found! Current display style:', modal.style.display);
        console.log('3. Setting modal to visible...');
        modal.style.display = 'block';
        console.log('4. Modal display style after change:', modal.style.display);
        console.log('5. Modal should now be visible!');
    } else {
        console.error('Modal element not found!');
    }
}

function checkElements() {
    console.log('=== CHECKING ALL ELEMENTS ===');
    
    const elements = {
        'gallery-modal': document.getElementById('gallery-modal'),
        'gallery-selector': document.getElementById('gallery-selector'),
        'select-from-gallery': document.getElementById('select-from-gallery'),
        'candidate-image': document.getElementById('candidate-image'),
        'close-modal': document.querySelector('.close-modal')
    };
    
    console.log('All elements found:', elements);
    
    // Check if elements exist
    Object.entries(elements).forEach(([name, element]) => {
        if (element) {
            console.log(`✅ ${name}: Found`);
        } else {
            console.error(`❌ ${name}: NOT FOUND`);
        }
    });
    
    // Check modal styles
    const modal = elements['gallery-modal'];
    if (modal) {
        console.log('Modal computed styles:', {
            display: window.getComputedStyle(modal).display,
            visibility: window.getComputedStyle(modal).visibility,
            zIndex: window.getComputedStyle(modal).zIndex,
            position: window.getComputedStyle(modal).position
        });
    }
}

// Real-time Vote Tracking
function startVoteTracking() {
    // Load initial vote data
    loadVoteTracking();
    
    // Refresh every 10 seconds
    setInterval(loadVoteTracking, 10000);
}

async function loadVoteTracking() {
    try {
        const response = await fetch('/api/vote-stats');
        if (!response.ok) {
            throw new Error('Failed to load vote statistics');
        }
        
        const stats = await response.json();
        displayVoteTracking(stats);
    } catch (error) {
        console.error('Error loading vote tracking:', error);
    }
}

function displayVoteTracking(stats) {
    const kingsVotes = document.getElementById('kings-votes');
    const queensVotes = document.getElementById('queens-votes');
    
    // Display Kings votes
    if (kingsVotes) {
        if (stats.candidates.kings && stats.candidates.kings.length > 0) {
            let kingsHtml = '';
            stats.candidates.kings.forEach(candidate => {
                const percentage = stats.totalVotes > 0 ? Math.round((candidate.votes / stats.totalVotes) * 100) : 0;
                kingsHtml += `
                    <div class="vote-item">
                        <div class="candidate-info">
                            <img src="${candidate.imageUrl || 'https://via.placeholder.com/40x40/ffd700/1a1333?text=👑'}" 
                                 alt="${candidate.name}" class="candidate-thumb">
                            <span class="candidate-name">${candidate.name}</span>
                        </div>
                        <div class="vote-stats">
                            <span class="vote-count">${candidate.votes || 0} votes</span>
                            <div class="vote-bar">
                                <div class="vote-fill" style="width: ${percentage}%"></div>
                            </div>
                            <span class="vote-percentage">${percentage}%</span>
                        </div>
                    </div>
                `;
            });
            kingsVotes.innerHTML = kingsHtml;
        } else {
            kingsVotes.innerHTML = '<p class="no-candidates">No kings added yet</p>';
        }
    }
    
    // Display Queens votes
    if (queensVotes) {
        if (stats.candidates.queens && stats.candidates.queens.length > 0) {
            let queensHtml = '';
            stats.candidates.queens.forEach(candidate => {
                const percentage = stats.totalVotes > 0 ? Math.round((candidate.votes / stats.totalVotes) * 100) : 0;
                queensHtml += `
                    <div class="vote-item">
                        <div class="candidate-info">
                            <img src="${candidate.imageUrl || 'https://via.placeholder.com/40x40/ff6b9d/1a1333?text=👑'}" 
                                 alt="${candidate.name}" class="candidate-thumb">
                            <span class="candidate-name">${candidate.name}</span>
                        </div>
                        <div class="vote-stats">
                            <span class="vote-count">${candidate.votes || 0} votes</span>
                            <div class="vote-bar">
                                <div class="vote-fill" style="width: ${percentage}%"></div>
                            </div>
                            <span class="vote-percentage">${percentage}%</span>
                        </div>
                    </div>
                `;
            });
            queensVotes.innerHTML = queensHtml;
        } else {
            queensVotes.innerHTML = '<p class="no-candidates">No queens added yet</p>';
        }
    }
}

// Display current user
function displayCurrentUser() {
    const session = JSON.parse(localStorage.getItem('adminSession') || '{}');
    const username = session.username || 'Admin';
    
    const currentUser = document.getElementById('current-user');
    if (currentUser) {
        currentUser.textContent = `Logged in as: ${username}`;
    }
}

// Load announcements
async function loadAnnouncements() {
    try {
        const response = await fetch('/api/announcements');
        if (!response.ok) {
            throw new Error('Failed to load announcements');
        }
        
        const data = await response.json();
        displayCurrentAnnouncement(data.current);
        displayAnnouncementHistory(data.history);
    } catch (error) {
        console.error('Error loading announcements:', error);
        showAlert('Failed to load announcements', 'error');
    }
}

// Display current announcement
function displayCurrentAnnouncement(announcement) {
    const currentAnnouncement = document.getElementById('current-announcement');
    const announcementText = document.querySelector('.announcement-text');
    const announcementTime = document.querySelector('.announcement-time');
    const announcementIcon = document.querySelector('.announcement-type-icon');
    
    if (announcement && currentAnnouncement && announcementText && announcementTime && announcementIcon) {
        announcementText.textContent = announcement.message;
        announcementTime.textContent = new Date(announcement.createdAt).toLocaleString();
        
        // Set icon based on type
        switch (announcement.type) {
            case 'emergency':
                announcementIcon.className = 'fas fa-exclamation-triangle announcement-type-icon emergency';
                break;
            case 'warning':
                announcementIcon.className = 'fas fa-exclamation-circle announcement-type-icon warning';
                break;
            default:
                announcementIcon.className = 'fas fa-info-circle announcement-type-icon info';
        }
        
        currentAnnouncement.style.display = 'block';
    } else if (currentAnnouncement) {
        currentAnnouncement.style.display = 'none';
    }
}

// Display announcement history
function displayAnnouncementHistory(history) {
    const historyList = document.getElementById('announcement-history-list');
    
    if (!historyList) return;
    
    if (history.length === 0) {
        historyList.innerHTML = '<p class="no-history">No previous announcements</p>';
        return;
    }
    
    let html = '';
    history.forEach(announcement => {
        const createdAt = new Date(announcement.createdAt).toLocaleString();
        const endedAt = announcement.endedAt ? new Date(announcement.endedAt).toLocaleString() : 'Active';
        
        html += `
            <div class="history-item">
                <div class="history-content">
                    <div class="history-header">
                        <i class="fas fa-${announcement.type === 'emergency' ? 'exclamation-triangle' : announcement.type === 'warning' ? 'exclamation-circle' : 'info-circle'} history-icon ${announcement.type}"></i>
                        <span class="history-type">${announcement.type.toUpperCase()}</span>
                        <span class="history-date">${createdAt}</span>
                    </div>
                    <p class="history-message">${announcement.message}</p>
                    <small class="history-ended">Ended: ${endedAt}</small>
                </div>
            </div>
        `;
    });
    
    historyList.innerHTML = html;
}

// Handle announcement creation
async function handleAnnouncementCreate(e) {
    e.preventDefault();
    
    const message = document.getElementById('announcement-message').value.trim();
    const type = document.getElementById('announcement-type').value;
    
    if (!message) {
        showAlert('Please enter an announcement message', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/announcements', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message,
                type
            })
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Failed to create announcement');
        }

        // Reset form and reload
        e.target.reset();
        loadAnnouncements();
        showAlert('Announcement posted successfully!', 'success');
    } catch (error) {
        console.error('Error creating announcement:', error);
        showAlert(error.message, 'error');
    }
}

// Remove current announcement
async function removeAnnouncement() {
    if (confirm('Are you sure you want to remove the current announcement?')) {
        try {
            const response = await fetch('/api/announcements/current', {
                method: 'DELETE'
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Failed to remove announcement');
            }

            loadAnnouncements();
            showAlert('Announcement removed successfully!', 'success');
        } catch (error) {
            console.error('Error removing announcement:', error);
            showAlert(error.message, 'error');
        }
    }
}

function handleDeviceImageSelection(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
        showMessage('Please select an image file', 'error');
        return;
    }
    
    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showMessage('Image file size must be less than 5MB', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const dataUrl = e.target.result;
        const imageInput = document.getElementById('candidate-image');
        if (imageInput) {
            imageInput.value = dataUrl;
            updateImagePreview();
        }
    };
    reader.readAsDataURL(file);
    
    // Clear the file input for future selections
    event.target.value = '';
}