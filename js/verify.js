// js/verify.js
async function verifyPayment(receipt) {
    const MAX_RETRIES = 10;
    const RETRY_DELAY = 5000; // 5 seconds
    let retries = 0;

    const statusElement = document.getElementById('payment-status');

    function updateStatus(message, isError = false) {
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = isError ? 'status-error' : 'status-success';
        } else {
            alert(message);
        }
    }

    async function checkPayment() {
        try {
            const response = await fetch('/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ receipt })
            });

            if (!response.ok) {
                throw new Error('Verification request failed');
            }

            const result = await response.json();

            if (result.ResultCode === '0') {
                // Payment successful
                updateStatus('Payment verified successfully! Your tickets have been confirmed.');
                window.location.href = 'tickets.html?success=true';
                return;
            } else if (result.ResultCode) {
                // Safaricom returned a non-success code
                updateStatus(`Verification failed: ${result.ResultDescription}`, true);
            } else if (retries < MAX_RETRIES) {
                // Payment not yet complete, retry
                retries++;
                updateStatus(`Payment pending... Retrying (${retries}/${MAX_RETRIES})`);
                setTimeout(checkPayment, RETRY_DELAY);
            } else {
                // Max retries reached
                updateStatus('Payment verification timed out. Please contact support.', true);
            }
        } catch (error) {
            console.error('Verification error:', error);
            if (retries < MAX_RETRIES) {
                retries++;
                updateStatus('An error occurred. Retrying...', true);
                setTimeout(checkPayment, RETRY_DELAY);
            } else {
                updateStatus('Verification failed after multiple retries. Please contact support.', true);
            }
        }
    }

    updateStatus('Initiating payment verification...');
    setTimeout(checkPayment, RETRY_DELAY);
}