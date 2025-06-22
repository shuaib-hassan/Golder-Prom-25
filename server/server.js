require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, '..'))); 
app.use(express.json()); // For parsing application/json 

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '..', 'assets', 'images', 'gallery');
        // Create directory if it doesn't exist
        fs.mkdir(uploadDir, { recursive: true }).then(() => {
            cb(null, uploadDir);
        }).catch(err => cb(err));
    },
    filename: function (req, file, cb) {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        // Accept only images
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// File paths for data storage (based on your project structure)
const VENUE_FILE = path.join(__dirname, 'data', 'venue.json');
const TICKETS_FILE = path.join(__dirname, 'data', 'tickets.json');
// THIS LINE IS CORRECT FOR payments.json BEING IN THE 'assets/data' FOLDER
const PAYMENTS_FILE = path.join(__dirname, '..', 'assets', 'data', 'payments.json');
const CANDIDATES_FILE = path.join(__dirname, 'data', 'candidates.json');
const VOTES_FILE = path.join(__dirname, 'data', 'votes.json');
const GALLERY_FILE = path.join(__dirname, 'data', 'gallery.json');

// --- Helper Functions ---

// Phone number formatting function to handle different input formats
const formatPhoneNumber = (phone) => {
    // Convert to string and remove all non-digit characters
    let cleanPhone = String(phone).replace(/\D/g, '');
    
    // If it starts with 0, replace with 254
    if (cleanPhone.startsWith('0')) {
        cleanPhone = '254' + cleanPhone.substring(1);
    }
    
    // If it doesn't start with 254, add it
    if (!cleanPhone.startsWith('254')) {
        cleanPhone = '254' + cleanPhone;
    }
    
    // Ensure it's exactly 12 digits
    if (cleanPhone.length !== 12) {
        throw new Error('Phone number must be 10 digits (e.g., 0712345678)');
    }
    
    return cleanPhone;
};

const getToken = async () => {
    try {
        const auth = Buffer.from(`${process.env.CONSUMER_KEY}:${process.env.CONSUMER_SECRET}`).toString('base64');
        const response = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
            headers: { 'Authorization': `Basic ${auth}` }
        });
        return response.data.access_token;
    } catch (error) {
        console.error('Token error:', error.response?.data || error.message);
        throw new Error('Failed to get token');
    }
};

// --- API Endpoints ---

// Explicit route for the root URL to serve index.html
// This now looks for index.html one level up from server.js
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Endpoint to get venue details
app.get('/api/venue', async (req, res) => {
    try {
        const data = await fs.readFile(VENUE_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        if (error.code === 'ENOENT') {
            // If venue.json doesn't exist, return a default
            return res.json({ name: "Venue details not set yet." });
        }
        console.error('Error reading venue file:', error);
        res.status(500).json({ error: 'Failed to retrieve venue details' });
    }
});

// Endpoint to update venue details (Admin)
app.post('/api/venue', async (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Venue name is required' });
    }
    try {
        await fs.writeFile(VENUE_FILE, JSON.stringify({ name }), 'utf8');
        res.json({ message: 'Venue updated successfully', name });
    } catch (error) {
        console.error('Error writing venue file:', error);
        res.status(500).json({ error: 'Failed to update venue details' });
    }
});

// Endpoint to get payment methods and ticket types
app.get('/api/payments', async (req, res) => {
    try {
        console.log('Attempting to read payments file from:', PAYMENTS_FILE);
        const data = await fs.readFile(PAYMENTS_FILE, 'utf8');
        console.log('File content length:', data.length);
        const parsed = JSON.parse(data);
        console.log('JSON parsed successfully');
        res.json(parsed);
    } catch (error) {
        // This is where the server-side error (e.g., ENOENT if file not found) is logged
        console.error('Error reading payments file:', error); 
        res.status(500).json({ 
            error: 'Failed to retrieve payment information', 
            details: error.message, 
            code: error.code, 
            path: PAYMENTS_FILE 
        });
    }
});

// Endpoint for purchasing tickets
app.post('/api/purchase-ticket', async (req, res) => {
    const { fullName, email, phone, ticketType, quantity, paymentMethod, amount } = req.body;

    // Input validation
    const errors = [];
    if (!fullName || typeof fullName !== 'string') errors.push('fullName must be a string');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Invalid email format');
    if (!ticketType || typeof ticketType !== 'string') errors.push('ticketType must be a string');
    if (!quantity || typeof quantity !== 'number' || quantity <= 0) errors.push('quantity must be a positive number');
    if (!paymentMethod || typeof paymentMethod !== 'string') errors.push('paymentMethod must be a string');
    if (!amount || typeof amount !== 'number' || amount <= 0) errors.push('amount must be a positive number');

    if (errors.length > 0) {
        return res.status(400).json({ error: 'Invalid input', details: errors });
    }

    // Format phone number
    let formattedPhone;
    try {
        formattedPhone = formatPhoneNumber(phone);
    } catch (phoneError) {
        return res.status(400).json({ 
            error: 'Invalid phone number', 
            details: phoneError.message,
            example: '0712345678'
        });
    }

    try {
        let tickets = [];
        try {
            const data = await fs.readFile(TICKETS_FILE, 'utf8');
            tickets = JSON.parse(data);
        } catch (readError) {
            if (readError.code !== 'ENOENT') {
                throw readError; 
            }
            // If file doesn't exist, tickets remains an empty array
        }

        const newTicket = {
            id: uuidv4(),
            fullName,
            email,
            phone: formattedPhone, // Store the formatted phone number
            ticketType,
            quantity,
            amount, 
            paymentMethod,
            purchaseDate: new Date().toISOString(),
            paymentStatus: paymentMethod === 'M-PESA' ? 'M-PESA_INITIATED' : 'PENDING'
        };

        tickets.push(newTicket);
        await fs.writeFile(TICKETS_FILE, JSON.stringify(tickets, null, 2), 'utf8');

        res.status(201).json({ message: 'Ticket purchase initiated!', ticketId: newTicket.id, paymentStatus: newTicket.paymentStatus });

    } catch (error) {
        console.error('Error processing ticket purchase:', error);
        res.status(500).json({ error: 'Failed to process ticket purchase' });
    }
});


// Endpoint for M-PESA STK Push
app.post('/stkpush', async (req, res) => {
    const { phone, amount } = req.body;

    // Input validation
    if (!amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    // Format phone number
    let formattedPhone;
    try {
        formattedPhone = formatPhoneNumber(phone);
        console.log(`📱 Converting phone: ${phone} → ${formattedPhone}`);
    } catch (phoneError) {
        return res.status(400).json({ 
            error: 'Invalid phone number format', 
            details: phoneError.message,
            example: '0712345678'
        });
    }

    try {
        // Check if M-PESA credentials are configured
        if (!process.env.CONSUMER_KEY || !process.env.CONSUMER_SECRET || !process.env.TILL_NUMBER || !process.env.MPESA_PASSKEY) {
            console.log('⚠️  M-PESA credentials not configured. Using simulation mode.');
            // Return simulated response for testing
            return res.json({
                ResponseCode: '0',
                ResponseDescription: 'Success (Simulation Mode)',
                CheckoutRequestID: 'ws_CO_' + Date.now(),
                MerchantRequestID: '29115-34620561-1'
            });
        }

        console.log(`📱 Initiating M-PESA STK Push for ${formattedPhone}, Amount: ${amount}`);
        
        const token = await getToken();
        const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, -5);
        const password = Buffer.from(`${process.env.TILL_NUMBER}${process.env.MPESA_PASSKEY}${timestamp}`).toString('base64');

        // Add retry mechanism
        let retries = 3;
        let lastError;
        while (retries > 0) {
            try {
                const stkResponse = await axios.post(
                    process.env.NODE_ENV === 'production' 
                        ? 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest' 
                        : 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
                    {
                        BusinessShortCode: process.env.TILL_NUMBER,
                        Password: password,
                        Timestamp: timestamp,
                        TransactionType: 'CustomerPayBillOnline',
                        Amount: amount,
                        PartyA: formattedPhone,
                        PartyB: process.env.TILL_NUMBER, 
                        PhoneNumber: formattedPhone,
                        CallBackURL: process.env.CALLBACK_URL || 'http://localhost:3000/callback',
                        AccountReference: 'PROM2025',
                        TransactionDesc: 'Prom Tickets'
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 30000 // 30 second timeout
                    }
                );
                console.log('✅ M-PESA STK Push initiated successfully');
                return res.json(stkResponse.data);
            } catch (error) {
                lastError = error;
                retries--;
                if (retries === 0) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
            }
        }
    } catch (error) {
        if (error.response?.data?.errorCode === '500.001.1001') {
            console.error('❌ M-PESA Merchant Error:', error.response.data);
            res.status(400).json({ 
                error: 'M-PESA payment failed', 
                details: 'Merchant does not exist. Please check your TILL number configuration.',
                solution: 'For sandbox testing, use TILL_NUMBER=174379. For production, ensure your TILL number is registered with Safaricom.',
                currentTill: process.env.TILL_NUMBER
            });
        } else if (error.response?.data?.errorCode === '400.002.02') {
            console.error('❌ M-PESA Timestamp Error:', error.response.data);
            res.status(400).json({ 
                error: 'M-PESA payment failed', 
                details: 'Invalid timestamp. Please try again.',
                solution: 'This is usually a temporary issue. Please retry the payment.'
            });
        } else {
        console.error('STK Push error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Payment processing failed' });
        }
    }
});

// Endpoint to verify M-PESA payment status
app.post('/verify', async (req, res) => {
    const { receipt } = req.body;

    // Input validation
    if (!receipt || typeof receipt !== 'string' || receipt.length !== 32) {
        return res.status(400).json({ error: 'Invalid CheckoutRequestID format' });
    }

    try {
        const token = await getToken();
        const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, -4);
        const password = Buffer.from(`${process.env.TILL_NUMBER}${process.env.MPESA_PASSKEY}${timestamp}`).toString('base64');

        // Add timeout for verification
        const response = await axios.post(
            process.env.NODE_ENV === 'production' 
                ? 'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query' 
                : 'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query',
            {
                BusinessShortCode: process.env.TILL_NUMBER,
                Password: password,
                Timestamp: timestamp,
                CheckoutRequestID: receipt
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000 // 30 second timeout
            }
        );

        const mpesaResponse = response.data;

        if (mpesaResponse.ResultCode === '0') {
            let tickets = [];
            try {
                const data = await fs.readFile(TICKETS_FILE, 'utf8');
                tickets = JSON.parse(data);
            } catch (readError) {
                console.error('Error reading tickets file:', readError);
                throw readError;
            }

            const updatedTickets = tickets.map(ticket => {
                if (ticket.paymentStatus === 'M-PESA_INITIATED' && mpesaResponse.ResultCode === '0') {
                    return { 
                        ...ticket, 
                        paymentStatus: 'PAID', 
                        mpesaReceipt: mpesaResponse.MpesaReceiptNumber,
                        paymentDate: new Date().toISOString()
                    };
                }
                return ticket;
            });

            try {
                await fs.writeFile(TICKETS_FILE, JSON.stringify(updatedTickets, null, 2), 'utf8');
            } catch (writeError) {
                console.error('Error updating tickets file:', writeError);
                throw writeError;
            }
        }

        res.json(mpesaResponse);
    } catch (error) {
        console.error('M-PESA Verification error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Payment verification failed' });
    }
});

// Endpoint to get voting candidates
app.get('/api/candidates', async (req, res) => {
    try {
        const data = await fs.readFile(CANDIDATES_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        if (error.code === 'ENOENT') {
            // If candidates.json doesn't exist, return empty array
            return res.json([]);
        }
        console.error('Error reading candidates file:', error);
        res.status(500).json({ error: 'Failed to retrieve candidates' });
    }
});

// Endpoint to add a new candidate (Admin only)
app.post('/api/candidates', async (req, res) => {
    const { name, type, imageUrl } = req.body;

    // Input validation
    if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'Name is required and must be a string' });
    }
    if (!type || !['king', 'queen'].includes(type)) {
        return res.status(400).json({ error: 'Type must be either "king" or "queen"' });
    }

    try {
        let candidates = [];
        try {
            const data = await fs.readFile(CANDIDATES_FILE, 'utf8');
            candidates = JSON.parse(data);
        } catch (readError) {
            if (readError.code !== 'ENOENT') {
                throw readError;
            }
        }

        // Check if candidate already exists
        const exists = candidates.some(c => c.name.toLowerCase() === name.toLowerCase() && c.type === type);
        if (exists) {
            return res.status(400).json({ error: 'This candidate already exists in this category' });
        }

        const newCandidate = {
            id: Date.now(),
            name: name.trim(),
            type,
            imageUrl: imageUrl || null,
            votes: 0,
            addedAt: new Date().toISOString()
        };

        candidates.push(newCandidate);
        await fs.writeFile(CANDIDATES_FILE, JSON.stringify(candidates, null, 2), 'utf8');

        res.status(201).json({ message: 'Candidate added successfully', candidate: newCandidate });
    } catch (error) {
        console.error('Error adding candidate:', error);
        res.status(500).json({ error: 'Failed to add candidate' });
    }
});

// Endpoint to delete a candidate (Admin only)
app.delete('/api/candidates/:id', async (req, res) => {
    const candidateId = parseInt(req.params.id);

    try {
        let candidates = [];
        try {
            const data = await fs.readFile(CANDIDATES_FILE, 'utf8');
            candidates = JSON.parse(data);
        } catch (readError) {
            if (readError.code !== 'ENOENT') {
                throw readError;
            }
        }

        const candidate = candidates.find(c => c.id === candidateId);
        if (!candidate) {
            return res.status(404).json({ error: 'Candidate not found' });
        }

        const updatedCandidates = candidates.filter(c => c.id !== candidateId);
        await fs.writeFile(CANDIDATES_FILE, JSON.stringify(updatedCandidates, null, 2), 'utf8');

        res.json({ message: 'Candidate removed successfully', removedCandidate: candidate });
    } catch (error) {
        console.error('Error removing candidate:', error);
        res.status(500).json({ error: 'Failed to remove candidate' });
    }
});

// Endpoint to submit a vote
app.post('/api/vote', async (req, res) => {
    const { king, queen, voterId } = req.body;

    // Input validation
    if (!king || !queen) {
        return res.status(400).json({ error: 'Please vote for both King and Queen' });
    }
    if (!voterId) {
        return res.status(400).json({ error: 'Voter ID is required' });
    }

    try {
        // Check if voter has already voted
        let votes = {};
        try {
            const votesData = await fs.readFile(VOTES_FILE, 'utf8');
            votes = JSON.parse(votesData);
        } catch (readError) {
            if (readError.code !== 'ENOENT') {
                throw readError;
            }
        }

        if (votes[voterId]) {
            return res.status(400).json({ error: 'You have already voted' });
        }

        // Load candidates to validate and update vote counts
        let candidates = [];
        try {
            const candidatesData = await fs.readFile(CANDIDATES_FILE, 'utf8');
            candidates = JSON.parse(candidatesData);
        } catch (readError) {
            if (readError.code !== 'ENOENT') {
                throw readError;
            }
        }

        // Validate that the voted candidates exist
        const kingCandidate = candidates.find(c => c.name === king && c.type === 'king');
        const queenCandidate = candidates.find(c => c.name === queen && c.type === 'queen');

        if (!kingCandidate || !queenCandidate) {
            return res.status(400).json({ error: 'Invalid candidate selection' });
        }

        // Update vote counts
        kingCandidate.votes = (kingCandidate.votes || 0) + 1;
        queenCandidate.votes = (queenCandidate.votes || 0) + 1;

        // Save updated candidates
        await fs.writeFile(CANDIDATES_FILE, JSON.stringify(candidates, null, 2), 'utf8');

        // Record the vote
        votes[voterId] = {
            king,
            queen,
            votedAt: new Date().toISOString()
        };
        await fs.writeFile(VOTES_FILE, JSON.stringify(votes, null, 2), 'utf8');

        res.json({ 
            message: 'Vote recorded successfully', 
            vote: votes[voterId],
            updatedCandidates: candidates
        });
    } catch (error) {
        console.error('Error recording vote:', error);
        res.status(500).json({ error: 'Failed to record vote' });
    }
});

// Endpoint to get voting statistics
app.get('/api/vote-stats', async (req, res) => {
    try {
        let candidates = [];
        let votes = {};

        try {
            const candidatesData = await fs.readFile(CANDIDATES_FILE, 'utf8');
            candidates = JSON.parse(candidatesData);
        } catch (readError) {
            if (readError.code !== 'ENOENT') {
                throw readError;
            }
        }

        try {
            const votesData = await fs.readFile(VOTES_FILE, 'utf8');
            votes = JSON.parse(votesData);
        } catch (readError) {
            if (readError.code !== 'ENOENT') {
                throw readError;
            }
        }

        const totalVotes = Object.keys(votes).length;
        const kings = candidates.filter(c => c.type === 'king');
        const queens = candidates.filter(c => c.type === 'queen');

        res.json({
            totalVotes,
            candidates: {
                kings,
                queens
            },
            totalCandidates: candidates.length
        });
    } catch (error) {
        console.error('Error getting vote stats:', error);
        res.status(500).json({ error: 'Failed to get voting statistics' });
    }
});

// Gallery Management Endpoints

// Get all gallery images
app.get('/api/gallery', async (req, res) => {
    try {
        const data = await fs.readFile(GALLERY_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        if (error.code === 'ENOENT') {
            // If gallery.json doesn't exist, return empty array
            return res.json([]);
        }
        console.error('Error reading gallery file:', error);
        res.status(500).json({ error: 'Failed to retrieve gallery images' });
    }
});

// Upload image to gallery
app.post('/api/gallery/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        const { title, description, uploadedBy } = req.body;
        
        let gallery = [];
        try {
            const data = await fs.readFile(GALLERY_FILE, 'utf8');
            gallery = JSON.parse(data);
        } catch (readError) {
            if (readError.code !== 'ENOENT') {
                throw readError;
            }
        }

        const newImage = {
            id: Date.now(),
            filename: req.file.filename,
            originalName: req.file.originalname,
            path: `/assets/images/gallery/${req.file.filename}`,
            title: title || 'Untitled',
            description: description || '',
            uploadedBy: uploadedBy || 'Anonymous',
            uploadedAt: new Date().toISOString(),
            likes: 0,
            views: 0
        };

        gallery.unshift(newImage); // Add to beginning of array
        await fs.writeFile(GALLERY_FILE, JSON.stringify(gallery, null, 2), 'utf8');

        res.status(201).json({ 
            message: 'Image uploaded successfully', 
            image: newImage 
        });
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ error: 'Failed to upload image' });
    }
});

// Like an image
app.post('/api/gallery/:id/like', async (req, res) => {
    try {
        const imageId = parseInt(req.params.id);
        
        let gallery = [];
        try {
            const data = await fs.readFile(GALLERY_FILE, 'utf8');
            gallery = JSON.parse(data);
            } catch (readError) {
            if (readError.code !== 'ENOENT') {
                throw readError;
            }
        }

        const image = gallery.find(img => img.id === imageId);
        if (!image) {
            return res.status(404).json({ error: 'Image not found' });
        }

        image.likes = (image.likes || 0) + 1;
        await fs.writeFile(GALLERY_FILE, JSON.stringify(gallery, null, 2), 'utf8');

        res.json({ message: 'Image liked successfully', likes: image.likes });
    } catch (error) {
        console.error('Error liking image:', error);
        res.status(500).json({ error: 'Failed to like image' });
    }
});

// Delete image from gallery (Admin only)
app.delete('/api/gallery/:id', async (req, res) => {
    try {
        const imageId = parseInt(req.params.id);
        
        let gallery = [];
        try {
            const data = await fs.readFile(GALLERY_FILE, 'utf8');
            gallery = JSON.parse(data);
        } catch (readError) {
            if (readError.code !== 'ENOENT') {
                throw readError;
            }
        }

        const image = gallery.find(img => img.id === imageId);
        if (!image) {
            return res.status(404).json({ error: 'Image not found' });
        }

        // Remove image file from filesystem
        try {
            const imagePath = path.join(__dirname, '..', image.path);
            await fs.unlink(imagePath);
        } catch (unlinkError) {
            console.log('Image file not found, continuing with deletion');
        }

        // Remove from gallery array
        const updatedGallery = gallery.filter(img => img.id !== imageId);
        await fs.writeFile(GALLERY_FILE, JSON.stringify(updatedGallery, null, 2), 'utf8');

        res.json({ message: 'Image deleted successfully', deletedImage: image });
    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).json({ error: 'Failed to delete image' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`🌐 Access the website at: http://localhost:${PORT}/`);
    console.log(`🔧 Access the admin panel at: http://localhost:${PORT}/admin.html`);
    console.log(`📱 M-PESA integration: ${process.env.CONSUMER_KEY ? 'Configured' : 'Not configured'}`);
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Handle 404 errors
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});