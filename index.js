const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const hostname = '127.0.0.1';
const port = 3000;

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
 
  const filePath = req.url === '/' ? './index.html' : `.${req.url}`;
  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(path.join(__dirname, filePath), (err, data) => {
    if (err) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain');
      res.end('404 Not Found');
    } else {
      res.statusCode = 200;
      res.setHeader('Content-Type', contentType);
      res.end(data);
    }
  });
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});

// Make sure your login form handles team member authentication

function handleLogin(email, password) {
    firebase.auth().signInWithEmailAndPassword(email, password)
        .then(async (userCredential) => {
            const user = userCredential.user;
            console.log('✅ User logged in:', user.email);
            
            try {
                // Get user data to determine role and redirect
                const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
                
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    const userRole = userData.role || 'user';
                    
                    console.log('👤 User role:', userRole);
                    
                    // Simplified role-based redirect
                    if (userRole === 'kitchen') {
                        window.location.href = '/html/kitchen.html';
                    } else {
                        window.location.href = '/html/Dashboard.html';
                    }
                } else {
                    console.warn('⚠️ No user document found, redirecting to dashboard');
                    window.location.href = '/html/Dashboard.html';
                }
                
            } catch (error) {
                console.error('❌ Error getting user data:', error);
                window.location.href = '/html/Dashboard.html';
            }
        })
        .catch((error) => {
            console.error('❌ Login error:', error);
            
            let errorMessage = 'Login failed';
            if (error.code === 'auth/user-not-found') {
                errorMessage = 'No account found with this email';
            } else if (error.code === 'auth/wrong-password') {
                errorMessage = 'Incorrect password';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email format';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Too many failed attempts. Try again later';
            }
            
            // Show error to user (adjust based on your UI)
            showLoginError(errorMessage);
        });
}