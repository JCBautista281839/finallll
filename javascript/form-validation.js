// Form validation helper functions

// Validate email format
function validateEmail(email) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

// Validate phone number format
function validatePhone(phone) {
    // Accept various international formats including Philippine numbers and US formats
    // Supports formats like: +63 961 865 4087, 09618654087, +639618654087, (123) 456-7890, etc.
    const internationalRe = /^(\+\d{1,3}\s?)?(\d{2,4}\s?)?\d{3,4}\s?\d{3,4}\s?\d{3,4}$/;
    const usRe = /^(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/;
    return internationalRe.test(String(phone)) || usRe.test(String(phone));
}

// Add validation to form fields
function addValidationToField(inputElement, validationFunction, errorMessage) {
    if (!inputElement) return;
    
    // Create or get the feedback element
    let feedbackElement = inputElement.nextElementSibling;
    if (!feedbackElement || !feedbackElement.classList.contains('invalid-feedback')) {
        feedbackElement = document.createElement('div');
        feedbackElement.classList.add('invalid-feedback');
        inputElement.parentNode.insertBefore(feedbackElement, inputElement.nextSibling);
    }
    feedbackElement.textContent = errorMessage;
    
    // Add validation event
    inputElement.addEventListener('blur', function() {
        const value = inputElement.value.trim();
        
        // Skip validation if field is empty and not required
        if (!value && !inputElement.hasAttribute('required')) {
            inputElement.classList.remove('is-invalid', 'is-valid');
            return;
        }
        
        // Run validation
        const isValid = validationFunction(value);
        
        if (isValid) {
            inputElement.classList.remove('is-invalid');
            inputElement.classList.add('is-valid');
        } else {
            inputElement.classList.remove('is-valid');
            inputElement.classList.add('is-invalid');
        }
    });
}

// Apply form validation to multiple fields
function setupFormValidation(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    // Find fields to validate
    const emailField = form.querySelector('#email');
    const phoneField = form.querySelector('#phone');
    const firstNameField = form.querySelector('#firstName');
    const lastNameField = form.querySelector('#lastName');
    
    // Apply validations
    if (emailField) {
        addValidationToField(emailField, validateEmail, 'Please enter a valid email address');
    }
    
    if (phoneField) {
        addValidationToField(phoneField, validatePhone, 'Please enter a valid phone number');
    }
    
    if (firstNameField) {
        addValidationToField(firstNameField, value => value.length > 0, 'First name is required');
    }
    
    if (lastNameField) {
        addValidationToField(lastNameField, value => value.length > 0, 'Last name is required');
    }
    
    // Add form submit handler
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Trigger validation on all fields
        form.querySelectorAll('input, select, textarea').forEach(input => {
            // Trigger blur event to validate
            const event = new Event('blur');
            input.dispatchEvent(event);
        });
        
        // Check for any invalid fields
        const invalidFields = form.querySelectorAll('.is-invalid');
        if (invalidFields.length > 0) {
            // Scroll to first invalid field
            invalidFields[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
            invalidFields[0].focus();
            
            // Show error toast
            if (window.showToast) {
                window.showToast('Please correct the errors in the form', 'error');
            }
            return;
        }
        
        // If validation passed, allow custom save function or default form submission
        if (window.saveUserData) {
            window.saveUserData();
        } else {
            form.submit();
        }
    });
}

// Auto-initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Skip if this is an OMR page to avoid conflicts
    if (window.location.pathname.includes('OMR') || window.location.pathname.includes('omr')) {
        return;
    }
    
    // Setup validation for user form if it exists
    setupFormValidation('userForm');
});
