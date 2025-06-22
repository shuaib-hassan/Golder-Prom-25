# M-PESA Integration Setup Guide

## Current Issue: "Merchant does not exist" Error

The error you're seeing occurs because your TILL number `3695210` is not valid for the M-PESA sandbox environment.

## Quick Fix

**Edit your `.env` file and change:**

```
TILL_NUMBER=3695210
```

**To:**

```
TILL_NUMBER=174379
```

## Complete M-PESA Setup Guide

### For Sandbox Testing (Recommended for Development)

1. **Use these sandbox credentials:**

   ```
   CONSUMER_KEY=Mz3ny3zbToksXZksPo8cMz9kXgGYXL5q3Z8J0ZgKHV0k5pN0
   CONSUMER_SECRET=GUS7Gxv0JEuPCC3miNAxYyxYNtFsE0QvnHJqAzKbcb4e2IOBbvkcxi8Alzi96GGp
   TILL_NUMBER=174379
   MPESA_PASSKEY=ybfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
   ```

2. **Test with sandbox phone numbers:**
   - Use any 10-digit number starting with 07 (e.g., 0712345678)
   - The app will automatically convert to international format

### For Production (Real M-PESA Payments)

1. **Get production credentials from Safaricom:**

   - Register at https://developer.safaricom.co.ke/
   - Apply for M-PESA API access
   - Get your production CONSUMER_KEY and CONSUMER_SECRET

2. **Register a TILL number:**

   - Contact Safaricom to register a TILL number for your business
   - This is required for real M-PESA payments

3. **Update your `.env` file with production credentials:**
   ```
   CONSUMER_KEY=your_production_key
   CONSUMER_SECRET=your_production_secret
   TILL_NUMBER=your_registered_till_number
   MPESA_PASSKEY=your_production_passkey
   ```

## Common Error Solutions

### "Merchant does not exist" (Error 500.001.1001)

- **Sandbox:** Use TILL_NUMBER=174379
- **Production:** Ensure your TILL number is registered with Safaricom

### "Invalid Timestamp" (Error 400.002.02)

- This is usually temporary, just retry the payment

### "Invalid PhoneNumber" (Error 400.002.01)

- Use format: 0712345678 (10 digits starting with 07)
- The app automatically converts to international format

## Testing the Integration

1. **Start the server:**

   ```bash
   node working-server.js
   ```

2. **Check server logs:**

   - Look for "✅ M-PESA integration: CONFIGURED"
   - Verify all credentials are loaded

3. **Test payment:**
   - Go to http://localhost:3000/tickets.html
   - Enter a phone number: 0712345678
   - Complete the payment process

## Phone Number Format

The app accepts phone numbers in local format:

- ✅ **Correct:** 0712345678, 0723456789, 0734567890
- ❌ **Wrong:** 254712345678, +254712345678

The app automatically converts local numbers to international format (254712345678).

## Support

If you continue to have issues:

1. Check the server console for detailed error messages
2. Verify your `.env` file has the correct format
3. Ensure no extra spaces or quotes in the credentials
4. Restart the server after making changes to `.env`
