// This script helps with browser compatibility issues
(function() {
    // 1. Handle high contrast mode warnings
    console.log('Setting up compatibility handlers...');

    // Add event listener for high contrast mode changes
    window.matchMedia('(forced-colors: active)').addEventListener('change', function(e) {
        console.log('Forced colors mode changed:', e.matches ? 'enabled' : 'disabled');
        // Trigger chart redraw if needed
        if (typeof updateChartColors === 'function') {
            const isDarkMode = document.body.classList.contains('dark-mode');
            updateChartColors(isDarkMode);
        }
    });

    // 2. Log browser compatibility info
    const userAgent = navigator.userAgent;
    const isChrome = userAgent.indexOf("Chrome") > -1;
    const isEdge = userAgent.indexOf("Edg") > -1;
    const isFirefox = userAgent.indexOf("Firefox") > -1;
    
    console.log('Browser compatibility check:');
    console.log(`- Chrome: ${isChrome}`);
    console.log(`- Edge: ${isEdge}`);
    console.log(`- Firefox: ${isFirefox}`);
    console.log(`- High Contrast/Forced Colors: ${window.matchMedia('(forced-colors: active)').matches}`);
})();
