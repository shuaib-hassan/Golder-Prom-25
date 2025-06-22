require('dotenv').config({ path: '.env' });
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3000;

// Performance optimizations
app.use(compression()); // Enable gzip compression
app.use(cors());
app.use(express.static('.', {
    maxAge: '1h', // Cache static files for 1 hour
    etag: true
})); 
app.use(express.json({ limit: '10mb' }));

// File paths
const PAYMENTS_FILE = path.join(__dirname, 'assets', 'data', 'payments.json');
const TICKETS_FILE = path.join(__dirname, 'server', 'data', 'tickets.json');

// Cache for payments data (refresh every 5 minutes)
let paymentsCache = null;
let paymentsCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// M-PESA Helper Functions
const getToken = async () => {
    try {
        const auth = Buffer.from(`${process.env.CONSUMER_KEY}:${process.env.CONSUMER_SECRET}`).toString('base64');
        const response = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
            headers: { 'Authorization': `Basic ${auth}` }
        });
        return response.data.access_token;
    } catch (error) {
        console.error('Token error:', error.response?.data || error.message);
        throw new Error('Failed to get M-PESA token');
    }
};

// Convert phone number to international format for M-PESA
const formatPhoneNumber = (phone) => {
    // Remove any spaces, dashes, or plus signs
    let cleanPhone = phone.replace(/[\s\-+]/g, '');
    
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

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Optimized payments endpoint with caching
app.get('/api/payments', async (req, res) => {
    try {
        const now = Date.now();
        
        // Return cached data if still valid
        if (paymentsCache && (now - paymentsCacheTime) < CACHE_DURATION) {
            return res.json(paymentsCache);
        }

        // Read fresh data
        const data = await fs.readFile(PAYMENTS_FILE, 'utf8');
        const parsed = JSON.parse(data);
        
        // Update cache
        paymentsCache = parsed;
        paymentsCacheTime = now;
        
        res.json(parsed);
    } catch (error) {
        console.error('Payments error:', error.message);
        res.status(500).json({ error: 'Failed to load payments data' });
    }
});

// Ticket purchase endpoint
app.post('/api/purchase-ticket', async (req, res) => {
    const { fullName, email, phone, ticketType, quantity, paymentMethod, amount } = req.body;

    if (!fullName || !email || !phone || !ticketType || !quantity || !paymentMethod || !amount) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        // Format phone number for validation
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

        let tickets = [];
        try {
            const data = await fs.readFile(TICKETS_FILE, 'utf8');
            tickets = JSON.parse(data);
        } catch (error) {
            // File doesn't exist, start with empty array
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

        res.status(201).json({ 
            message: 'Ticket purchase initiated!', 
            ticketId: newTicket.id,
            paymentStatus: newTicket.paymentStatus
        });

    } catch (error) {
        console.error('Purchase error:', error.message);
        res.status(500).json({ error: 'Failed to process ticket purchase' });
    }
});

// Real M-PESA STK Push endpoint
app.post('/stkpush', async (req, res) => {
    const { phone, amount } = req.body;
    
    if (!phone || !amount) {
        return res.status(400).json({ error: 'Phone and amount required' });
    }

    try {
        // Format phone number to international format
        const formattedPhone = formatPhoneNumber(phone);
        console.log(`📱 Converting phone: ${phone} → ${formattedPhone}`);
        
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

        const stkResponse = await axios.post(
            'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
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
                timeout: 30000
            }
        );

        console.log('✅ M-PESA STK Push initiated successfully');
        res.json(stkResponse.data);

    } catch (error) {
        if (error.message.includes('Phone number must be')) {
            console.error('❌ Phone number format error:', error.message);
            res.status(400).json({ 
                error: 'Invalid phone number format', 
                details: 'Please use format: 0712345678 (10 digits starting with 07)',
                example: '0712345678'
            });
        } else if (error.response?.data?.errorCode === '500.001.1001') {
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
            console.error('❌ M-PESA STK Push failed:', error.response?.data || error.message);
            res.status(500).json({ 
                error: 'M-PESA payment failed', 
                details: error.response?.data || error.message,
                help: 'If this error persists, please check your M-PESA credentials and try again.'
            });
        }
    }
});

// M-PESA payment verification endpoint
app.post('/verify', async (req, res) => {
    const { receipt } = req.body;

    if (!receipt) {
        return res.status(400).json({ error: 'Receipt ID required' });
    }

    // Check if M-PESA credentials are configured
    if (!process.env.CONSUMER_KEY || !process.env.CONSUMER_SECRET || !process.env.TILL_NUMBER || !process.env.MPESA_PASSKEY) {
        console.log('⚠️  M-PESA credentials not configured. Using simulation mode.');
        return res.json({
            ResultCode: '0',
            ResultDesc: 'Success (Simulation Mode)',
            MpesaReceiptNumber: 'SIM' + Date.now()
        });
    }

    try {
        console.log(`🔍 Verifying M-PESA payment: ${receipt}`);
        
        const token = await getToken();
        const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, -5);
        const password = Buffer.from(`${process.env.TILL_NUMBER}${process.env.MPESA_PASSKEY}${timestamp}`).toString('base64');

        const response = await axios.post(
            'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query',
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
                timeout: 30000
            }
        );

        const mpesaResponse = response.data;

        if (mpesaResponse.ResultCode === '0') {
            // Update ticket status to paid
            let tickets = [];
            try {
                const data = await fs.readFile(TICKETS_FILE, 'utf8');
                tickets = JSON.parse(data);
            } catch (error) {
                console.error('Error reading tickets file:', error);
            }

            const updatedTickets = tickets.map(ticket => {
                if (ticket.paymentStatus === 'M-PESA_INITIATED') {
                    return { 
                        ...ticket, 
                        paymentStatus: 'PAID', 
                        mpesaReceipt: mpesaResponse.MpesaReceiptNumber,
                        paymentDate: new Date().toISOString()
                    };
                }
                return ticket;
            });

            await fs.writeFile(TICKETS_FILE, JSON.stringify(updatedTickets, null, 2), 'utf8');
            console.log('✅ Payment verified and ticket status updated');
        }

        res.json(mpesaResponse);

    } catch (error) {
        console.error('❌ Payment verification failed:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Payment verification failed', 
            details: error.response?.data || error.message 
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🚀 Optimized server running on http://localhost:${PORT}`);
    console.log(`⚡ Performance optimizations enabled:`);
    console.log(`   - Gzip compression`);
    console.log(`   - Static file caching (1 hour)`);
    console.log(`   - API response caching (5 minutes)`);
    console.log(`🎫 Ticket purchasing is now working!`);
    
    // Check M-PESA configuration with detailed logging
    console.log(`🔍 Checking M-PESA configuration...`);
    console.log(`   CONSUMER_KEY: ${process.env.CONSUMER_KEY ? 'SET (' + process.env.CONSUMER_KEY.substring(0, 10) + '...)' : 'NOT SET'}`);
    console.log(`   CONSUMER_SECRET: ${process.env.CONSUMER_SECRET ? 'SET (' + process.env.CONSUMER_SECRET.substring(0, 10) + '...)' : 'NOT SET'}`);
    console.log(`   TILL_NUMBER: ${process.env.TILL_NUMBER ? 'SET (' + process.env.TILL_NUMBER + ')' : 'NOT SET'}`);
    console.log(`   MPESA_PASSKEY: ${process.env.MPESA_PASSKEY ? 'SET (' + process.env.MPESA_PASSKEY.substring(0, 10) + '...)' : 'NOT SET'}`);
    
    if (process.env.CONSUMER_KEY && process.env.CONSUMER_SECRET && process.env.TILL_NUMBER && process.env.MPESA_PASSKEY) {
        console.log(`✅ M-PESA integration: CONFIGURED - Real STK push will be sent`);
    } else {
        console.log(`⚠️  M-PESA integration: NOT CONFIGURED - Using simulation mode`);
        console.log(`   To enable real M-PESA payments, create a .env file with:`);
        console.log(`   CONSUMER_KEY=your_key`);
        console.log(`   CONSUMER_SECRET=your_secret`);
        console.log(`   TILL_NUMBER=your_till`);
        console.log(`   MPESA_PASSKEY=your_passkey`);
    }
}); 