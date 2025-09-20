function updateClock() {
    const now = new Date();
    const weekday = now.getDay();
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Get hours in 12-hour format
    let hours = now.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    
    // Format minutes with leading zero
    const minutes = now.getMinutes().toString().padStart(2, '0');
    
    // Format the time string: "12:00 PM Monday"
    const timeString = `${hours}:${minutes} ${ampm} ${weekdays[weekday]}`;
    
    // Update the datetime display
    const datetimeDisplay = document.getElementById('currentDateTime');
    if (datetimeDisplay) {
        datetimeDisplay.textContent = timeString;
    }
}

updateClock();
setInterval(updateClock, 60000); // Update every minute instead of every second
