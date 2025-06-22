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
    
    // Gallery image selector
    const selectFromGalleryBtn = document.getElementById('select-from-gallery');
    if (selectFromGalleryBtn) {
        selectFromGalleryBtn.addEventListener('click', openGalleryModal);
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

    // Start real-time vote tracking
    startVoteTracking();
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
        const logoutLi = document.createElement('li');
        logoutLi.innerHTML = `
            <a href="#" onclick="logout()" style="color: #ff6b9d;">
                <i class="fas fa-sign-out-alt"></i> Logout
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
    
    if (!name || !type) {
        showAlert('Please fill in all required fields', 'error');
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
                imageUrl: imageUrl || null
            })
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Failed to add candidate');
        }

        // Reset form and reload
        e.target.reset();
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
    
    return `
        <div class="candidate-card admin-candidate" data-id="${candidate.id}">
            <img src="${candidate.imageUrl || defaultImage}" alt="${candidate.name}" class="candidate-img" onerror="this.src='${defaultImage}'">
            <h5>${candidate.name}</h5>
            <p class="candidate-votes">Votes: ${candidate.votes || 0}</p>
            <button class="remove-candidate btn-transparent" data-id="${candidate.id}">
                <i class="fas fa-trash"></i> Remove
            </button>
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
function handleVenueUpdate(e) {
        e.preventDefault();
        const venue = document.getElementById('venue').value.trim();
        
        if (venue) {
            localStorage.setItem('promVenue', venue);
            updateVenuePreview(venue);
            showAlert('Venue updated successfully!', 'success');
        } else {
            showAlert('Please enter a valid venue', 'error');
        }
}

// Load venue
function loadVenue() {
    const savedVenue = localStorage.getItem('promVenue');
    if (savedVenue) {
        document.getElementById('venue').value = savedVenue;
        updateVenuePreview(savedVenue);
    }
}

// Update venue preview
    function updateVenuePreview(venue) {
        const preview = document.getElementById('venue-preview');
        if (preview) {
        preview.innerHTML = `
            <h3>Current Venue:</h3>
            <p>${venue || 'No venue set yet'}</p>
        `;
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
async function openGalleryModal() {
    const modal = document.getElementById('gallery-modal');
    const gallerySelector = document.getElementById('gallery-selector');
    
    if (modal && gallerySelector) {
        modal.style.display = 'block';
        await loadGalleryForSelection();
    }
}

function closeGalleryModal() {
    const modal = document.getElementById('gallery-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function loadGalleryForSelection() {
    try {
        const response = await fetch('/api/gallery');
        if (!response.ok) {
            throw new Error('Failed to load gallery');
        }
        
        const images = await response.json();
        displayGalleryForSelection(images);
    } catch (error) {
        console.error('Error loading gallery for selection:', error);
        const gallerySelector = document.getElementById('gallery-selector');
        if (gallerySelector) {
            gallerySelector.innerHTML = '<div class="error">Failed to load gallery images</div>';
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
            <div class="gallery-item-selector" onclick="selectGalleryImage('${image.path}', '${image.title}')">
                <img src="${image.path}" alt="${image.title}" onerror="this.src='assets/images/placeholder.jpg'">
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
    }
    closeGalleryModal();
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