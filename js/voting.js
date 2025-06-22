// voting.js
document.addEventListener('DOMContentLoaded', function() {
    const votingForm = document.getElementById('voting-form');
    if (!votingForm) return;

    // Select the message element
    const voteMessage = document.getElementById('vote-message');

    // Generate a unique voter ID (you can enhance this with user authentication)
    const voterId = generateVoterId();

    // Check if user has already voted
    const hasVoted = localStorage.getItem(`hasVoted_${voterId}`);
    if (hasVoted) {
        // Hide the form and show the "already voted" message
        votingForm.style.display = 'none';
        if (voteMessage) {
            voteMessage.textContent = 'You have already voted. Thank you for participating!';
            voteMessage.style.display = 'block';
        }
        return;
    }

    // Load and display candidates
    loadCandidatesForVoting();

    // Handle vote submission
    votingForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const selectedKing = document.querySelector('input[name="king"]:checked');
        const selectedQueen = document.querySelector('input[name="queen"]:checked');
        
        if (!selectedKing || !selectedQueen) {
            showVoteAlert('Please vote for both King and Queen', 'error');
            return;
        }

        try {
            const response = await fetch('/api/vote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    king: selectedKing.value,
                    queen: selectedQueen.value,
                    voterId: voterId
                })
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Failed to submit vote');
            }

            // Mark as voted locally
            localStorage.setItem(`hasVoted_${voterId}`, 'true');
            
            showVoteAlert('Thank you for voting! Your vote has been recorded.', 'success');
            
            // Reload the page to show the "already voted" message
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch (error) {
            console.error('Error submitting vote:', error);
            showVoteAlert(error.message, 'error');
        }
    });
});

// Generate a unique voter ID
function generateVoterId() {
    // Use a combination of timestamp and random number
    // In a real app, you'd use user authentication
    return `voter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Load candidates for voting
async function loadCandidatesForVoting() {
    try {
        const response = await fetch('/api/candidates');
        if (!response.ok) {
            throw new Error('Failed to load candidates');
        }
        
        const candidates = await response.json();
        const votingForm = document.getElementById('voting-form');
        
        if (!votingForm) return;
        
        // Clear existing form content
        votingForm.innerHTML = '';
        
        // Group candidates by type
        const kings = candidates.filter(c => c.type === 'king');
        const queens = candidates.filter(c => c.type === 'queen');
        
        // Create voting sections
        if (kings.length > 0) {
            const kingSection = createVotingSection('king', 'Prom King', kings);
            votingForm.appendChild(kingSection);
        }
        
        if (queens.length > 0) {
            const queenSection = createVotingSection('queen', 'Prom Queen', queens);
            votingForm.appendChild(queenSection);
        }
        
        // Add submit button
        const submitButton = document.createElement('button');
        submitButton.type = 'submit';
        submitButton.className = 'btn-gold';
        submitButton.innerHTML = '<i class="fas fa-vote-yea"></i> Submit Vote';
        votingForm.appendChild(submitButton);
        
        // Show message if no candidates
        if (kings.length === 0 && queens.length === 0) {
            votingForm.innerHTML = `
                <div class="no-candidates-message">
                    <i class="fas fa-info-circle"></i>
                    <p>No candidates have been added yet. Please check back later!</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading candidates:', error);
        const votingForm = document.getElementById('voting-form');
        if (votingForm) {
            votingForm.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load candidates. Please try again later.</p>
                </div>
            `;
        }
    }
}

// Create voting section for a category
function createVotingSection(type, title, candidates) {
    const section = document.createElement('div');
    section.className = 'voting-section';
    
    const titleElement = document.createElement('h3');
    titleElement.innerHTML = `<i class="fas fa-crown"></i> Vote for ${title}:`;
    section.appendChild(titleElement);
    
    const candidatesGrid = document.createElement('div');
    candidatesGrid.className = 'candidates-grid-voting';
    
    candidates.forEach(candidate => {
        const candidateCard = createVotingCard(candidate, type);
        candidatesGrid.appendChild(candidateCard);
    });
    
    section.appendChild(candidatesGrid);
    return section;
}

// Create individual voting card
function createVotingCard(candidate, type) {
    const card = document.createElement('div');
    card.className = 'candidate-card voting-card';
    
    const defaultImage = type === 'king' ? 
        'https://via.placeholder.com/100x100/ffd700/1a1333?text=👑' : 
        'https://via.placeholder.com/100x100/ff6b9d/1a1333?text=👑';
    
    card.innerHTML = `
        <div class="candidate-image-container">
            <img src="${candidate.imageUrl || defaultImage}" alt="${candidate.name}" class="candidate-img" onerror="this.src='${defaultImage}'">
            <div class="vote-overlay">
                <i class="fas fa-check"></i>
            </div>
        </div>
        <h4>${candidate.name}</h4>
        <p class="vote-count">Votes: ${candidate.votes || 0}</p>
        <input type="radio" name="${type}" value="${candidate.name}" id="${candidate.id}" required>
        <label for="${candidate.id}" class="vote-label">Vote for ${candidate.name}</label>
    `;
    
    // Add click handler for card selection
    const radio = card.querySelector('input[type="radio"]');
    const label = card.querySelector('.vote-label');
    
    [card, label].forEach(element => {
        element.addEventListener('click', () => {
            // Uncheck all other radios in this category
            document.querySelectorAll(`input[name="${type}"]`).forEach(r => {
                r.checked = false;
                r.closest('.voting-card').classList.remove('selected');
            });
            
            // Check this radio and mark card as selected
            radio.checked = true;
            card.classList.add('selected');
        });
    });
    
    return card;
}

// Show vote alert
function showVoteAlert(message, type) {
    const voteMessage = document.getElementById('vote-message');
    if (voteMessage) {
        voteMessage.textContent = message;
        voteMessage.className = `alert ${type}`;
        voteMessage.style.display = 'block';
    } else {
        alert(message);
    }
}