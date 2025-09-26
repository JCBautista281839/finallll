
  // Show 'Change Password' link below password input only in edit mode
  document.addEventListener('DOMContentLoaded', function() {
    let passwordInput = null;
    let passwordField = null;
    const labels = Array.from(document.querySelectorAll('.profile-label'));
    for (const label of labels) {
      if (label.textContent.trim().startsWith('Password')) {
        passwordField = label.closest('.profile-field');
        if (passwordField) {
          passwordInput = passwordField.querySelector('input.profile-input[type="password"]');
        }
      }
    }
    if (!passwordInput || !passwordField) return;
    let changePwLink = passwordField.querySelector('.change-password-link');
    if (!changePwLink) {
      changePwLink = document.createElement('a');
      changePwLink.href = '#';
      changePwLink.textContent = 'Change Password';
      changePwLink.className = 'change-password-link';
      changePwLink.style.display = 'none';
      changePwLink.style.fontSize = '12px';
      changePwLink.style.color = '#760000';
      changePwLink.style.marginTop = '4px';
      changePwLink.style.cursor = 'pointer';
      changePwLink.style.textDecoration = 'none';
      passwordInput.insertAdjacentElement('afterend', changePwLink);
    }
    // Helper to remove new password fields
    function removeNewPasswordFields() {
      const wrapper = passwordField.parentNode.querySelector('.change-password-wrapper');
      if (wrapper) wrapper.remove();
    }
    // Toggle new password fields
    let pwFieldsVisible = false;
    changePwLink.addEventListener('click', function(e) {
      e.preventDefault();
      // If already visible, remove and toggle off
      if (pwFieldsVisible) {
        removeNewPasswordFields();
        pwFieldsVisible = false;
        return;
      }

  // If not visible, create and show
  removeNewPasswordFields(); // Defensive: always remove first
  // Create wrapper
  let wrapper = document.createElement('div');
  wrapper.className = 'change-password-wrapper';
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';
  wrapper.style.gap = '10px';
  wrapper.style.marginTop = '10px';
  // New Password
  let newPw = document.createElement('input');
  newPw.type = 'password';
  newPw.placeholder = 'New Password';
  newPw.className = 'profile-input new-password-field';
  // Confirm New Password
  let confirmPw = document.createElement('input');
  confirmPw.type = 'password';
  confirmPw.placeholder = 'Confirm New Password';
  confirmPw.className = 'profile-input confirm-password-field';
  // Error message
  let errorMsg = document.createElement('div');
  errorMsg.className = 'password-match-error';
  errorMsg.style.color = 'red';
  errorMsg.style.fontSize = '0.9em';
  errorMsg.style.marginTop = '-6px';
  errorMsg.style.display = 'none';
  // Password strength error
  let pwStrengthError = document.createElement('div');
  pwStrengthError.className = 'password-strength-error';
  pwStrengthError.style.color = 'red';
  pwStrengthError.style.fontSize = '0.9em';
  pwStrengthError.style.marginTop = '-6px';
  pwStrengthError.style.display = 'none';

  // Common weak passwords
  const weakPw = ['password', '12345678', '123456789', 'qwerty', 'letmein', '11111111', '123123123', 'abc12345'];

      // Validation logic
      function validatePwMatchAndStrength() {
        // Password strength
        let pw = newPw.value;
        let pwValid = true;
        let pwError = '';
        if (pw.length < 8) {
          pwValid = false;
          pwError = 'Password must be at least 8 characters.';
        } else if (!/[A-Z]/.test(pw)) {
          pwValid = false;
          pwError = 'Password must include an uppercase letter.';
        } else if (!/[a-z]/.test(pw)) {
          pwValid = false;
          pwError = 'Password must include a lowercase letter.';
        } else if (!/[0-9]/.test(pw)) {
          pwValid = false;
          pwError = 'Password must include a number.';
        } else if (/^\s|\s$/.test(pw)) {
          pwValid = false;
          pwError = 'Password cannot start or end with a space.';
        } else if (weakPw.includes(pw.toLowerCase())) {
          pwValid = false;
          pwError = 'Password is too common or weak.';
        }
        if (!pwValid) {
          pwStrengthError.textContent = pwError;
          pwStrengthError.style.display = '';
        } else {
          pwStrengthError.textContent = '';
          pwStrengthError.style.display = 'none';
        }
        // Password match
        if (newPw.value && confirmPw.value && newPw.value !== confirmPw.value) {
          errorMsg.textContent = "Passwords doesn't match";
          errorMsg.style.display = '';
        } else {
          errorMsg.textContent = '';
          errorMsg.style.display = 'none';
        }
      }
  newPw.addEventListener('input', validatePwMatchAndStrength);
  confirmPw.addEventListener('input', validatePwMatchAndStrength);
  wrapper.appendChild(newPw);
  wrapper.appendChild(pwStrengthError);
  wrapper.appendChild(confirmPw);
  wrapper.appendChild(errorMsg);
  // Insert wrapper after the entire password field row
  passwordField.insertAdjacentElement('afterend', wrapper);
  pwFieldsVisible = true;
    });
    function toggleChangePwLink() {
      const container = document.querySelector('.profile-settings-wrapper');
      if (container.classList.contains('editing')) {
        changePwLink.style.display = 'block';
      } else {
        changePwLink.style.display = 'none';
        removeNewPasswordFields();
        pwFieldsVisible = false;
      }
    }
    // Listen for edit/save/cancel
    const editBtn = document.querySelector('.edit-profile-btn');
    const saveBtn = document.querySelector('.save-profile-btn');
    const cancelBtn = document.querySelector('.cancel-profile-btn');
    if (editBtn) editBtn.addEventListener('click', function() { setTimeout(toggleChangePwLink, 0); });
    if (saveBtn) saveBtn.addEventListener('click', function() { setTimeout(toggleChangePwLink, 0); });
    if (cancelBtn) cancelBtn.addEventListener('click', function() { setTimeout(toggleChangePwLink, 0); });
    // Initial state
    toggleChangePwLink();
  });
  // Email Address input: robust validation and normalization
  (function() {
    // Find Email Address input by label text
    let emailInput = null;
    const labels = Array.from(document.querySelectorAll('.profile-label'));
    for (const label of labels) {
      if (label.textContent.trim().startsWith('Email Address')) {
        const field = label.closest('.profile-field');
        if (field) {
          emailInput = field.querySelector('input.profile-input');
        }
      }
    }
    if (!emailInput) return;
    // Defensive: remove previous listeners
    emailInput._emailSanitizeListener && emailInput.removeEventListener('input', emailInput._emailSanitizeListener);
    emailInput._emailBlurListener && emailInput.removeEventListener('blur', emailInput._emailBlurListener);
    // Sanitize pasted/typed value: trim, remove spaces, lowercase on blur
    function sanitizeEmailInput(e) {
      const old = this.value;
      // Remove all spaces and trim
      let v = this.value.replace(/\s+/g, '');
      // No commas
      v = v.replace(/,+/g, '');
      this.value = v;
      if (old !== this.value) {
        let err = this.parentNode.querySelector('.inline-error');
        if (!err) {
          err = document.createElement('div');
          err.className = 'inline-error';
          err.setAttribute('role', 'alert');
          err.style.color = 'red';
          err.style.fontSize = '0.9em';
          err.style.marginTop = '2px';
          this.parentNode.appendChild(err);
        }
        err.textContent = 'Spaces and commas are not allowed in email';
        this.setAttribute('aria-invalid', 'true');
        err.style.display = '';
      } else {
        let err = this.parentNode.querySelector('.inline-error');
        if (err) err.style.display = 'none';
        this.removeAttribute('aria-invalid');
      }
    }
    function normalizeEmailOnBlur(e) {
      this.value = this.value.trim().toLowerCase();
    }
    emailInput.addEventListener('input', sanitizeEmailInput);
    emailInput._emailSanitizeListener = sanitizeEmailInput;
    emailInput.addEventListener('blur', normalizeEmailOnBlur);
    emailInput._emailBlurListener = normalizeEmailOnBlur;
    // Store original value for Cancel
    emailInput.dataset.originalValue = emailInput.value;
    // Restore on Cancel (hook into exitEditMode)
    const origExitEditMode = window.exitEditMode;
    window.exitEditMode = function(save) {
      if (!save && emailInput.dataset.originalValue !== undefined) {
        emailInput.value = emailInput.dataset.originalValue;
      }
      if (typeof origExitEditMode === 'function') origExitEditMode(save);
    };
  })();
// Profile Edit/Save/Cancel logic for .profile-settings-wrapper
(function() {
  // Find the profile container
  const container = document.querySelector('.profile-settings-wrapper');
  if (!container) return;

  // Find buttons using existing selectors
  const editBtn = container.querySelector('.edit-profile-btn');
  let saveBtn = container.querySelector('.save-profile-btn');
  let cancelBtn = container.querySelector('.cancel-profile-btn');
  const leftPanel = container.querySelector('.profile-left');

  // Select ALL input, select, textarea fields inside the profile form
  function getProfileFields() {
    return container.querySelectorAll('input, select, textarea');
  }

  // Dynamically create Save and Cancel if not present, and insert above .logout-link
  function ensureSaveCancelButtons() {
    const logoutLink = leftPanel.querySelector('.logout-link');
    // Create flex row wrapper for buttons if not present
    let btnRow = leftPanel.querySelector('.profile-btn-row');
    if (!btnRow) {
      btnRow = document.createElement('div');
      btnRow.className = 'profile-btn-row';
      btnRow.style.marginTop = '24px';
      btnRow.style.display = 'flex';
      btnRow.style.flexDirection = 'row';
      btnRow.style.justifyContent = 'space-between';
    }
    if (!saveBtn) {
      saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'save-profile-btn';
      saveBtn.textContent = 'Save Profile';
      saveBtn.style.display = 'none';
      saveBtn.style.marginLeft = '10px';
      saveBtn.style.width = '500px';
      saveBtn.style.height = '40px';
      saveBtn.style.border = 'none';
      saveBtn.style.background = '#760000';
      saveBtn.style.color = '#fff';
      saveBtn.style.cursor = 'pointer';
      saveBtn.style.fontSize = '16px';
      saveBtn.style.borderRadius = '15px';
      saveBtn.style.display = 'inline-block';
    }
    if (!cancelBtn) {
      cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'cancel-profile-btn';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.display = 'none';
      cancelBtn.style.width = '500px';
      cancelBtn.style.height = '40px';
      cancelBtn.style.border = 'none';
      cancelBtn.style.background = '#760000';
      cancelBtn.style.color = '#fff';
      cancelBtn.style.cursor = 'pointer';
      cancelBtn.style.fontSize = '16px';
      cancelBtn.style.borderRadius = '15px';
    }
    // Only insert if not already in DOM
    if (!btnRow.contains(saveBtn)) btnRow.appendChild(saveBtn);
    if (!btnRow.contains(cancelBtn)) btnRow.appendChild(cancelBtn);
    if (logoutLink && btnRow.parentNode !== leftPanel) {
      leftPanel.insertBefore(btnRow, logoutLink);
    } else if (logoutLink && btnRow.nextSibling !== logoutLink) {
      leftPanel.insertBefore(btnRow, logoutLink);
    }
  }
  ensureSaveCancelButtons();

  // Helper: store original values for all fields
  function storeOriginalValues(fields) {
    fields.forEach(field => {
      field.dataset.originalValue = field.value;
    });
  }

  // Helper: restore original values for all fields
  function restoreOriginalValues(fields) {
    fields.forEach(field => {
      if (field.dataset.originalValue !== undefined) {
        field.value = field.dataset.originalValue;
      }
    });
  }

  // Helper: set readonly/disabled state for all fields
  function setReadOnly(fields, isReadOnly) {
    fields.forEach(field => {
      // Special case: Address input is always readonly unless add button is clicked
      if (field.name === undefined && field.classList.contains('profile-input') && field.parentNode.querySelector('.addAddress')) {
        // Do not toggle here; handled by add button logic
        return;
      }
      if (isReadOnly) {
        field.setAttribute('readonly', 'readonly');
        field.setAttribute('disabled', 'disabled');
      } else {
        field.removeAttribute('readonly');
        field.removeAttribute('disabled');
      }
    });
  }
  // Address add button: only visible in edit mode
  (function() {
    const addBtn = document.querySelector('img.addAddress');
    let addressInput = null;
    if (addBtn) {
      const parent = addBtn.parentNode;
      addressInput = parent.querySelector('input.profile-input');
      addBtn.style.display = 'none';
    }
    function toggleAddBtn() {
      if (!addBtn) return;
      const container = document.querySelector('.profile-settings-wrapper');
      if (container.classList.contains('editing')) {
        addBtn.style.display = '';
        if (addressInput) {
          addressInput.removeAttribute('readonly');
          addressInput.removeAttribute('disabled');
        }
      } else {
        addBtn.style.display = 'none';
        if (addressInput) {
          addressInput.setAttribute('readonly', 'readonly');
          addressInput.setAttribute('disabled', 'disabled');
        }
      }
    }
    // Hook into actual enterEditMode/exitEditMode
    const realEnter = typeof enterEditMode === 'function' ? enterEditMode : null;
    const realExit = typeof exitEditMode === 'function' ? exitEditMode : null;
    if (editBtn) {
      editBtn.addEventListener('click', function() {
        setTimeout(toggleAddBtn, 0);
      });
    }
    if (saveBtn) {
      saveBtn.addEventListener('click', function() {
        setTimeout(toggleAddBtn, 0);
      });
    }
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function() {
        setTimeout(toggleAddBtn, 0);
      });
    }
    // Initial state
    toggleAddBtn();
  })();

  // Helper: show/hide buttons
  function setButtonStates(editing) {
    if (editing) {
      editBtn.style.display = 'none';
      saveBtn.style.display = '';
      cancelBtn.style.display = '';
    } else {
      editBtn.style.display = '';
      saveBtn.style.display = 'none';
      cancelBtn.style.display = 'none';
    }
  }

  // enterEditMode: enable all fields and store originals
  function enterEditMode() {
    const fields = getProfileFields();
    storeOriginalValues(fields);
    setReadOnly(fields, false);
    setButtonStates(true);
    container.classList.add('editing');
    if (fields.length > 0) fields[0].focus();
    // Debug: log edit mode and input state
    const fullNameInput = container.querySelector('input[name="fullName"]');
    if (fullNameInput) {
      console.log('[DEBUG] Edit mode active. Full Name input enabled:', !fullNameInput.disabled, 'Value:', fullNameInput.value);
    }
  }

  // exitEditMode: disable all fields, optionally save or revert
  function exitEditMode(save) {
    const fields = getProfileFields();
    if (!save) restoreOriginalValues(fields);
    setReadOnly(fields, true);
    setButtonStates(false);
    container.classList.remove('editing');
    // Clear stored originals
    fields.forEach(field => { delete field.dataset.originalValue; });
    if (!save && editBtn) editBtn.focus();
  }

  // validateInputs: basic required check
  function validateInputs(fields) {
      // Email Address: must be a valid email (strict)
      if (field === emailInput) {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(field.value)) {
          field.setCustomValidity('Please enter a valid email address');
          valid = false;
        }
      }
    let valid = true;
    fields.forEach(field => {
      field.setCustomValidity('');
      // Remove previous error border
      field.style.border = '';
      // Full Name: only letters and spaces
      if (field.name === 'fullName') {
        if (!/^[A-Za-z ]+$/.test(field.value) || !field.value.trim()) {
          field.setCustomValidity('Full Name must contain only letters and spaces');
          field.style.border = '2px solid red';
          valid = false;
        }
      }
      // Contact Number: only digits, exactly 11
      if (field.name === 'contactNumber') {
        if (!/^\d{11}$/.test(field.value)) {
          field.setCustomValidity('Contact Number must be exactly 11 digits');
          field.style.border = '2px solid red';
          valid = false;
        }
      }
      // Email Address: must be a valid email
      if (field.name === 'email' || (field.parentNode && field.parentNode.querySelector('.profile-label') && field.parentNode.querySelector('.profile-label').textContent.trim().startsWith('Email Address'))) {
        // Standard email regex
        const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
        if (!emailRegex.test(field.value)) {
          field.setCustomValidity('Please enter a valid email address');
          field.style.border = '2px solid red';
          valid = false;
        }
      }
      if (field.hasAttribute('required') && !field.value.trim()) {
        field.setCustomValidity('This field is required');
        field.style.border = '2px solid red';
        valid = false;
      }
    });
    return valid;
  }

  // Remove any previous event listeners that toggle readonly on blur/focusout/change
  var allFields = getProfileFields();
  allFields.forEach(function(field) {
    field.onblur = null;
    field.onfocusout = null;
    field.onchange = null;
  });

  // By default, all fields are readonly
  setReadOnly(allFields, true);
  setButtonStates(false);

  // Prevent Enter from submitting
  allFields.forEach(function(field) {
    field.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') e.preventDefault();
    });
  });

  // Idempotent event wiring
  editBtn.onclick = function(e) {
    e.preventDefault();
    if (!container.classList.contains('editing')) enterEditMode();
  };

  // Save button handler (ensure validation blocks save and shows errors)
  function handleSaveProfile() {
    const fields = document.querySelectorAll('.profile-input');
    let valid = validateInputs(fields);
    // Show error messages if invalid
    fields.forEach(field => field.reportValidity());
    if (!valid) return; // Block save if invalid
    exitEditMode();
  }

  // Fix: define saveHandlerRef to avoid ReferenceError
  if (typeof window.saveHandlerRef !== 'function') {
    window.saveHandlerRef = function(){};
  }
  saveBtn.removeEventListener('click', window.saveHandlerRef);
  window.saveHandlerRef = handleSaveProfile;
  saveBtn.addEventListener('click', handleSaveProfile);

  cancelBtn.onclick = function(e) {
    e.preventDefault();
    exitEditMode(false);
  };

  // Restrict input for Full Name and Contact Number fields
  // Robust input restriction for Full Name and Contact Number
  (function() {
    const fullNameInput = document.querySelector('input[name="fullName"]');
    const contactNumberInput = document.querySelector('input[name="contactNumber"]');
    if (fullNameInput) {
      // Block numbers and symbols on keydown
      fullNameInput.addEventListener('keydown', function(e) {
        if (
          e.ctrlKey || e.metaKey || e.altKey ||
          [8,9,13,16,17,18,20,27,32,37,38,39,40,46].includes(e.keyCode)
        ) return;
        if (!/^[A-Za-z ]$/.test(e.key)) e.preventDefault();
      });
      // Sanitize on input (for paste)
      fullNameInput.addEventListener('input', function(e) {
        const old = this.value;
        this.value = this.value.replace(/[^A-Za-z ]+/g, '');
        if (old !== this.value) {
          let err = this.parentNode.querySelector('.inline-error');
          if (!err) {
            err = document.createElement('div');
            err.className = 'inline-error';
            err.setAttribute('role', 'alert');
            err.style.color = 'red';
            err.style.fontSize = '0.9em';
            err.style.marginTop = '2px';
            this.parentNode.appendChild(err);
          }
          err.textContent = 'Only letters and spaces allowed';
          this.setAttribute('aria-invalid', 'true');
          err.style.display = '';
        } else {
          let err = this.parentNode.querySelector('.inline-error');
          if (err) err.style.display = 'none';
          this.removeAttribute('aria-invalid');
        }
      });
    }
    if (contactNumberInput) {
      contactNumberInput.addEventListener('keydown', function(e) {
        if (
          e.ctrlKey || e.metaKey || e.altKey ||
          [8,9,13,16,17,18,20,27,37,38,39,40,46].includes(e.keyCode)
        ) return;
        if (!/^[0-9]$/.test(e.key)) e.preventDefault();
      });
      contactNumberInput.addEventListener('input', function(e) {
        this.value = this.value.replace(/\D+/g, '').slice(0, 11);
      });
    }
  })();
})();
