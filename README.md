# Prom Night 2025: Enchanted Dreams

A beautiful and modern web application for managing prom night tickets, payments, and event details.

## Features

- 🎫 **Ticket Management**: Purchase tickets with different tiers (Standard, VIP)
- 💳 **M-PESA Integration**: Secure mobile payment processing
- 📱 **Responsive Design**: Works perfectly on all devices
- 🎨 **Modern UI**: Beautiful animations and visual effects
- 🔧 **Admin Panel**: Manage venue details and view ticket sales
- 📊 **Real-time Updates**: Live countdown and payment status

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd prom-talimar
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` and add your M-PESA API credentials:
   ```env
   CONSUMER_KEY=your_consumer_key_here
   CONSUMER_SECRET=your_consumer_secret_here
   TILL_NUMBER=your_till_number_here
   MPESA_PASSKEY=your_mpesa_passkey_here
   CALLBACK_URL=http://localhost:3000/callback
   NODE_ENV=development
   PORT=3000
   ```

4. **Start the application**
   ```bash
   npm start
   ```

5. **Access the application**
   - Main site: http://localhost:3000
   - Admin panel: http://localhost:3000/admin.html

## Project Structure

```
prom-talimar/
├── server/                 # Backend server
│   ├── server.js          # Main server file
│   └── data/              # Data storage
├── assets/                # Static assets
│   ├── data/              # Configuration files
│   ├── images/            # Images and logos
│   └── audio/             # Audio files
├── css/                   # Stylesheets
├── js/                    # Frontend JavaScript
├── *.html                 # HTML pages
└── package.json           # Dependencies and scripts
```

## API Endpoints

### Public Endpoints
- `GET /` - Main homepage
- `GET /api/venue` - Get venue details
- `GET /api/payments` - Get payment methods and ticket types
- `POST /api/purchase-ticket` - Purchase a ticket
- `POST /stkpush` - Initiate M-PESA payment
- `POST /verify` - Verify M-PESA payment

### Admin Endpoints
- `POST /api/venue` - Update venue details

## M-PESA Integration

The application integrates with Safaricom's M-PESA API for mobile payments. To set up:

1. Register for M-PESA API access at [Safaricom Developer Portal](https://developer.safaricom.co.ke/)
2. Get your API credentials (Consumer Key, Consumer Secret, Till Number, Passkey)
3. Add them to your `.env` file
4. Test with sandbox credentials first

## Troubleshooting

### Common Issues

1. **Server won't start**
   - Check if port 3000 is available
   - Ensure all dependencies are installed: `npm install`

2. **M-PESA payments not working**
   - Verify your `.env` file has correct credentials
   - Check if you're using sandbox or production URLs
   - Ensure phone numbers start with "254"

3. **Static files not loading**
   - Check if the server is running on the correct port
   - Verify file paths in the HTML files

4. **Database errors**
   - Ensure the `server/data/` directory exists
   - Check file permissions

### Development

For development with auto-restart:
```bash
npm run dev
```

Note: You'll need to install `nodemon` globally or as a dev dependency for this to work.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For support, please contact the development team or create an issue in the repository. 