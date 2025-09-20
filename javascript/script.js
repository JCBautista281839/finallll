
document.addEventListener('DOMContentLoaded', function () {
    const mainContent = document.getElementById('mainContent');
    if (mainContent) {
        mainContent.style.display = 'block';
        mainContent.style.opacity = '1';
    }
});
document.addEventListener('DOMContentLoaded', () => {
    const forgot = document.querySelector('.forgot-password');
    if (forgot) {
        forgot.addEventListener('click', (e) => {
            e.preventDefault();
            if (!window.auth) {
                alert('Password reset unavailable: Firebase not initialized.');
                return;
            }
            const userInput = document.getElementById('username')?.value.trim();
            if (!userInput) {
                alert('Enter your username first.');
                return;
            }
            const email = userInput.includes('@') ? userInput : `${userInput}@victoria-bistro.com`;
            window.auth.sendPasswordResetEmail(email)
                .then(() => alert('Password reset email sent.'))
                .catch(err => alert('Reset failed: ' + (err.message || err.code)));
        });
    }
});
