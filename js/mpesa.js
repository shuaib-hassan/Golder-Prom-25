// js/mpesa.js
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎫 M-PESA script loaded successfully');
    
    const paymentForm = document.getElementById('payment-form');
    const ticketTypeSelect = document.getElementById('ticket-type');
    const quantityInput = document.getElementById('quantity');
    const amountInput = document.getElementById('amount');
    const paymentMethodSelect = document.getElementById('payment-method');
    const payButton = document.getElementById('pay-button');
    const instructionsDiv = document.getElementById('payment-instructions');

    console.log('🔍 Form elements found:', {
        paymentForm: !!paymentForm,
        ticketTypeSelect: !!ticketTypeSelect,
        quantityInput: !!quantityInput,
        amountInput: !!amountInput,
        paymentMethodSelect: !!paymentMethodSelect,
        payButton: !!payButton,
        instructionsDiv: !!instructionsDiv
    });

    let ticketTypesData = [];
    let paymentMethodsData = [];

    // Function to fetch payment methods and ticket types
    async function fetchPaymentData() {
        try {
            console.log('📡 Fetching payment data...');
            const response = await fetch('/api/payments');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log('✅ Payment data received:', data);
            
            ticketTypesData = data.ticket_types;
            paymentMethodsData = data.payment_methods;

            populateDropdowns();
            calculateAmount(); // Calculate initial amount
        } catch (error) {
            console.error('❌ Error fetching payment data:', error);
            alert('Failed to load ticket and payment options. Please try again later.');
        }
    }

    // Function to populate dropdowns
    function populateDropdowns() {
        console.log('🔄 Populating dropdowns...');
        
        // Populate Ticket Type dropdown
        ticketTypeSelect.innerHTML = '<option value="">Select Ticket Type</option>';
        ticketTypesData.forEach(type => {
            const option = document.createElement('option');
            option.value = type.id;
            option.textContent = `${type.name} (KSH ${type.price})`;
            ticketTypeSelect.appendChild(option);
        });

        // Populate Payment Method dropdown
        paymentMethodSelect.innerHTML = '<option value="">Select Payment Method</option>';
        paymentMethodsData.forEach(method => {
            const option = document.createElement('option');
            option.value = method.name; // Use name as value (e.g., "M-PESA")
            option.textContent = method.name;
            paymentMethodSelect.appendChild(option);
        });
        
        console.log('✅ Dropdowns populated');
    }

    // Function to calculate total amount based on selected ticket type and quantity
    function calculateAmount() {
        const selectedTicketTypeId = ticketTypeSelect.value;
        const quantity = parseInt(quantityInput.value, 10);

        if (selectedTicketTypeId && quantity > 0) {
            const selectedTicket = ticketTypesData.find(type => type.id == selectedTicketTypeId);
            if (selectedTicket) {
                amountInput.value = selectedTicket.price * quantity;
            }
        } else {
            amountInput.value = ''; // Clear amount if no valid selection
        }
    }

    // Function to update payment instructions
    function updatePaymentInstructions() {
        const selectedMethodName = paymentMethodSelect.value;
        const selectedMethod = paymentMethodsData.find(method => method.name === selectedMethodName);
        if (selectedMethod) {
            instructionsDiv.textContent = selectedMethod.instructions;
            instructionsDiv.style.display = 'block';
        } else {
            instructionsDiv.textContent = '';
            instructionsDiv.style.display = 'none';
        }
    }

    // Event listeners for dropdowns and quantity to update amount
    ticketTypeSelect.addEventListener('change', calculateAmount);
    quantityInput.addEventListener('input', calculateAmount);
    paymentMethodSelect.addEventListener('change', updatePaymentInstructions);

    // Form submission handler
    if (paymentForm) {
        paymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('🚀 Form submitted, processing ticket purchase...');

            payButton.disabled = true;
            payButton.textContent = 'Processing...';

            const fullName = document.getElementById('full-name').value.trim();
            const email = document.getElementById('email').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const selectedTicketTypeId = ticketTypeSelect.value;
            const selectedTicket = ticketTypesData.find(type => type.id == selectedTicketTypeId);
            const ticketType = selectedTicket ? selectedTicket.name : ticketTypeSelect.options[ticketTypeSelect.selectedIndex]?.text.split('(')[0]?.trim() || '';
            const quantity = parseInt(quantityInput.value, 10);
            const paymentMethod = paymentMethodSelect.value;
            const amount = parseFloat(amountInput.value);

            console.log('📋 Form data:', {
                fullName,
                email,
                phone,
                ticketType,
                quantity,
                paymentMethod,
                amount
            });

            if (!fullName || !email || !phone || !ticketType || !quantity || !paymentMethod || !amount) {
                alert('Please fill in all required fields.');
                payButton.disabled = false;
                payButton.textContent = 'Buy Ticket';
                return;
            }

            try {
                // Step 1: Record the ticket purchase on the backend
                console.log('📤 Sending ticket purchase request...');
                const purchaseResponse = await fetch('/api/purchase-ticket', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fullName,
                        email,
                        phone,
                        ticketType,
                        quantity,
                        paymentMethod,
                        amount // Include amount for purchase record
                    })
                });

                const purchaseResult = await purchaseResponse.json();
                console.log('✅ Purchase response:', purchaseResult);

                if (!purchaseResponse.ok) {
                    throw new Error(purchaseResult.error || 'Failed to record ticket purchase.');
                }

                alert(`Ticket purchase initiated! Status: ${purchaseResult.paymentStatus}`);

                // Step 2: If M-PESA, initiate STK push
                if (paymentMethod === 'M-PESA') {
                    console.log('📱 Initiating M-PESA STK push...');
                    const stkResponse = await fetch('/stkpush', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ phone, amount })
                    });

                    const stkResult = await stkResponse.json();
                    console.log('📱 STK push response:', stkResult);

                    if (!stkResponse.ok) {
                        throw new Error(stkResult.error || 'M-PESA payment initiation failed');
                    }

                    if (stkResult.ResponseCode === '0') {
                        alert('M-PESA STK Push initiated! Complete payment on your phone.');
                        // Optionally start verification
                        // verifyPayment(stkResult.CheckoutRequestID); // Ensure verifyPayment is defined in verify.js
                    } else {
                        throw new Error(stkResult.errorMessage || 'M-PESA payment failed.');
                    }
                } else {
                    // For non-M-PESA methods, just show success and possibly redirect
                    alert('Ticket order placed. Please follow instructions for payment.');
                    // window.location.href = 'tickets.html?order=placed'; // Example redirect
                }

            } catch (error) {
                console.error('❌ Ticket purchase error:', error);
                alert(`Error: ${error.message}`);
            } finally {
                payButton.disabled = false;
                payButton.textContent = 'Buy Ticket';
            }
        });
    }

    // Initial fetch of data when the page loads
    console.log('🚀 Starting initial data fetch...');
    fetchPaymentData();
});