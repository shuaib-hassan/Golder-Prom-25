// js/tickets.js
document.addEventListener('DOMContentLoaded', async function() {
    const ticketTypeSelect = document.getElementById('ticket-type');
    const quantityInput = document.getElementById('quantity');
    const totalPriceSpan = document.getElementById('total-price');
    const paymentMethodsContainer = document.getElementById('payment-methods');
    const ticketForm = document.getElementById('ticket-form');
    const alertMessage = document.getElementById('alert-message');
    const ticketConfirmation = document.getElementById('ticket-confirmation');
    const generatedTicketNumber = document.getElementById('generated-ticket-number');
    const confirmedEmail = document.getElementById('confirmed-email');
    const phoneNumberInput = document.getElementById('phone-number');

    let ticketData = {
        ticket_types: [],
        payment_methods: []
    };
    let selectedTicketPrice = 0;
    let selectedPaymentMethodId = null;

    // Function to display alerts
    function showAlert(message, type = 'error') {
        alertMessage.textContent = message;
        alertMessage.className = `alert-message ${type}`;
        alertMessage.style.display = 'block';
        setTimeout(() => {
            alertMessage.style.display = 'none';
        }, 5000);
    }

    // Fetch payment data from payments.json
    async function fetchPaymentData() {
        try {
            const response = await fetch('/api/payments'); // Adjusted to fetch from server.js endpoint
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            ticketData = await response.json();
            populateTicketTypes();
            populatePaymentMethods();
            updateTotalPrice();
        } catch (error) {
            console.error('Error fetching payment data:', error);
            showAlert('Failed to load ticket information. Please try again later.', 'error');
        }
    }

    // Populate ticket types dropdown
    function populateTicketTypes() {
        ticketTypeSelect.innerHTML = ''; // Clear existing options
        if (ticketData.ticket_types && ticketData.ticket_types.length > 0) {
            ticketData.ticket_types.forEach(type => {
                const option = document.createElement('option');
                option.value = type.id;
                option.textContent = `${type.name} - KES ${type.price}`;
                ticketTypeSelect.appendChild(option);
            });
            // Set initial selected ticket price
            const selectedOption = ticketData.ticket_types.find(type => type.id === parseInt(ticketTypeSelect.value));
            if (selectedOption) {
                selectedTicketPrice = selectedOption.price;
            }
        } else {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No ticket types available';
            ticketTypeSelect.appendChild(option);
            ticketTypeSelect.disabled = true;
            showAlert('No ticket types are currently available.', 'warning');
        }
    }

    // Populate payment methods
    function populatePaymentMethods() {
        paymentMethodsContainer.innerHTML = '';
        if (ticketData.payment_methods && ticketData.payment_methods.length > 0) {
            ticketData.payment_methods.forEach(method => {
                const label = document.createElement('label');
                label.className = 'payment-method-item';

                const input = document.createElement('input');
                input.type = 'radio';
                input.name = 'payment-method';
                input.value = method.id;
                input.required = true;
                input.addEventListener('change', () => {
                    selectedPaymentMethodId = parseInt(input.value);
                    togglePhoneNumberField();
                });

                const img = document.createElement('img');
                img.src = method.logo;
                img.alt = method.name;

                const span = document.createElement('span');
                span.textContent = method.name;

                const instructions = document.createElement('p');
                instructions.className = 'payment-instructions';
                instructions.textContent = method.instructions;

                label.appendChild(input);
                label.appendChild(img);
                label.appendChild(span);
                label.appendChild(instructions);
                paymentMethodsContainer.appendChild(label);
            });
            // Pre-select the first payment method if available
            if (ticketData.payment_methods.length > 0) {
                paymentMethodsContainer.querySelector('input[name="payment-method"]').checked = true;
                selectedPaymentMethodId = parseInt(paymentMethodsContainer.querySelector('input[name="payment-method"]').value);
                togglePhoneNumberField();
            }
        } else {
            paymentMethodsContainer.innerHTML = '<p>No payment methods available.</p>';
            showAlert('No payment methods are currently available.', 'warning');
        }
    }

    // Toggle phone number field visibility based on payment method
    function togglePhoneNumberField() {
        const mpesaMethod = ticketData.payment_methods.find(method => method.name === 'M-PESA');
        if (mpesaMethod && selectedPaymentMethodId === mpesaMethod.id) {
            phoneNumberInput.closest('.form-group').style.display = 'block';
            phoneNumberInput.setAttribute('required', 'required');
        } else {
            phoneNumberInput.closest('.form-group').style.display = 'none';
            phoneNumberInput.removeAttribute('required');
            phoneNumberInput.value = ''; // Clear phone number if not M-PESA
        }
    }

    // Update total price
    function updateTotalPrice() {
        const selectedOption = ticketData.ticket_types.find(type => type.id === parseInt(ticketTypeSelect.value));
        if (selectedOption) {
            selectedTicketPrice = selectedOption.price;
        } else {
            selectedTicketPrice = 0;
        }
        const quantity = parseInt(quantityInput.value);
        const total = selectedTicketPrice * quantity;
        totalPriceSpan.textContent = total.toLocaleString(); // Format with commas
    }

    // Event listeners
    ticketTypeSelect.addEventListener('change', updateTotalPrice);
    quantityInput.addEventListener('input', updateTotalPrice);

    ticketForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const fullName = document.getElementById('full-name').value;
        const email = document.getElementById('email').value;
        const phoneNumber = phoneNumberInput.value;
        const ticketTypeId = parseInt(ticketTypeSelect.value);
        const quantity = parseInt(quantityInput.value);

        if (!selectedPaymentMethodId) {
            showAlert('Please select a payment method.', 'error');
            return;
        }

        const selectedTicketType = ticketData.ticket_types.find(type => type.id === ticketTypeId);
        if (!selectedTicketType) {
            showAlert('Invalid ticket type selected.', 'error');
            return;
        }

        const selectedPaymentMethod = ticketData.payment_methods.find(method => method.id === selectedPaymentMethodId);
        if (!selectedPaymentMethod) {
            showAlert('Invalid payment method selected.', 'error');
            return;
        }

        if (selectedPaymentMethod.name === 'M-PESA' && !phoneNumber) {
            showAlert('Phone number is required for M-PESA payments.', 'error');
            return;
        }

        showAlert('Processing your request...', 'info');

        const purchaseData = {
            fullName,
            email,
            phoneNumber: selectedPaymentMethod.name === 'M-PESA' ? phoneNumber : null,
            ticketTypeId,
            quantity,
            totalPrice: selectedTicketPrice * quantity,
            paymentMethodId: selectedPaymentMethodId
        };

        try {
            const response = await fetch('/api/purchase-ticket', { // Endpoint to your server.js
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(purchaseData)
            });

            const result = await response.json();

            if (response.ok) {
                showAlert('Ticket purchased successfully!', 'success');
                ticketForm.style.display = 'none';
                ticketConfirmation.style.display = 'block';
                generatedTicketNumber.textContent = result.ticketNumber;
                confirmedEmail.textContent = email;
            } else {
                showAlert(result.message || 'Ticket purchase failed. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Error during ticket purchase:', error);
            showAlert('An unexpected error occurred. Please try again later.', 'error');
        }
    });

    // Initial fetch of data
    fetchPaymentData();
});