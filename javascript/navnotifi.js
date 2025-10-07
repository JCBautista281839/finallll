const notifIcon = document.querySelector('.nav-link[title="Notifications"] .nav-icon');
const dropdown = document.getElementById('notificationDropdown');
const closeDropdown = document.getElementById('closeDropdown');
if (notifIcon) {
    notifIcon.addEventListener('click', function (e) {
        e.preventDefault();
        if (dropdown) {
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
            if (dropdown.style.display === 'block' && typeof loadDropdownNotifications === 'function') {
                loadDropdownNotifications();
            }
        }
    });
}
if (closeDropdown) {
    closeDropdown.addEventListener('click', function () {
        dropdown.style.display = 'none';
    });
}
window.addEventListener('click', function (e) {
    if (!dropdown) return;
    if (!dropdown.contains(e.target) && !notifIcon.contains(e.target)) {
        dropdown.style.display = 'none';
    }
});
function loadDropdownNotifications() {
    const db = window.db || (firebase && firebase.firestore ? firebase.firestore() : null);
    const list = document.getElementById('dropdownNotificationsList');
    if (!db || !list) return;
    db.collection('notifications').orderBy('timestamp', 'desc').limit(5).get()
        .then(function (querySnapshot) {
            if (querySnapshot.empty) {
                list.innerHTML = '<div class="text-center text-muted py-3">No notifications</div>';
                return;
            }
            let html = '';
            // Detect dark mode
            const isDark = document.body.classList.contains('dark-mode');
            const nameColor = isDark ? '#ffc9b3' : '#760000';
            const messageColor = isDark ? '#f1f1f1' : '#222';
            querySnapshot.forEach(function (doc) {
                const data = doc.data();
                html += `<div class="dropdown-item d-flex align-items-center py-2 px-2" style="word-wrap: break-word !important; overflow-wrap: break-word !important; max-width: 350px !important;">
                    <div class="flex-grow-1" style="word-wrap: break-word !important; overflow-wrap: break-word !important; max-width: 280px !important;">
                        <div style="color:${nameColor};margin-top:-5px; word-wrap: break-word !important; overflow-wrap: break-word !important;">${data.name || 'System'}</div>
                        <div style="font-size:12px;color:${messageColor}; word-wrap: break-word !important; overflow-wrap: break-word !important; white-space: normal !important; word-break: break-word !important;">${data.message || ''}</div>
                    </div>
                    <div style="font-size:12px;color:#888;min-width:70px;text-align:right;">${data.timestamp && data.timestamp.toDate ? timeAgo(data.timestamp.toDate()) : ''}</div>
                </div>`;
            });
            list.innerHTML = html;
        });
}
function timeAgo(date) {
    var now = new Date();
    var seconds = Math.floor((now - date) / 1000);
    var interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return interval + ' year' + (interval > 1 ? 's' : '') + ' ago';
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return interval + ' month' + (interval > 1 ? 's' : '') + ' ago';
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return interval + ' day' + (interval > 1 ? 's' : '') + ' ago';
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval + ' hour' + (interval > 1 ? 's' : '') + ' ago';
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval + ' minute' + (interval > 1 ? 's' : '') + ' ago';
    return 'Just now';
}
document.addEventListener('DOMContentLoaded', function () {
    var notifLink = document.querySelector('.nav-link[title="Notifications"]');
    if (notifLink) {
        notifLink.addEventListener('click', function () {
            if (typeof loadNotifications === 'function') {
                loadNotifications();
            }
        });
    }
});