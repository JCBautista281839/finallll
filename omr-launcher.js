#!/usr/bin/env node
/**
 * OMR Server Launcher Service
 * This Node.js script creates a simple HTTP server that can start/stop the OMR Python server
 * Run this with: node omr-launcher.js
 */

const express = require('express');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001; // Different port from OMR server (5000)

// Enable CORS for browser requests
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

app.use(express.json());

let omrServerProcess = null;

// Status endpoint
app.get('/status', (req, res) => {
    res.json({
        launcher: 'running',
        omrServer: omrServerProcess ? 'running' : 'stopped',
        port: PORT,
        omrPort: 5000
    });
});

// Start OMR server endpoint
app.post('/start-omr', (req, res) => {
    if (omrServerProcess) {
        return res.json({
            success: true,
            message: 'OMR server is already running',
            pid: omrServerProcess.pid
        });
    }

    try {
        console.log('🚀 Starting OMR server...');
        
        // Try to run the batch file first (Windows)
        if (process.platform === 'win32') {
            const batchPath = path.join(__dirname, 'start_omr_server.bat');
            
            if (fs.existsSync(batchPath)) {
                exec(`"${batchPath}"`, (error, stdout, stderr) => {
                    if (error) {
                        console.error('❌ Batch file error:', error);
                    } else {
                        console.log('✅ Batch file executed successfully');
                    }
                });
                
                return res.json({
                    success: true,
                    message: 'OMR server batch file executed',
                    method: 'batch'
                });
            }
        }
        
        // Fallback: Direct Python execution
        const pythonCommands = ['python', 'python3', 'py'];
        let pythonCmd = 'python';
        
        // Find available Python command
        for (const cmd of pythonCommands) {
            try {
                exec(`${cmd} --version`, (error) => {
                    if (!error) {
                        pythonCmd = cmd;
                        return;
                    }
                });
            } catch (e) {
                // Continue to next command
            }
        }
        
        const omrScriptPath = path.join(__dirname, 'omr', 'omr_web_circle_scanner.py');
        
        omrServerProcess = spawn(pythonCmd, [omrScriptPath], {
            detached: true,
            stdio: ['ignore', 'pipe', 'pipe']
        });
        
        omrServerProcess.stdout.on('data', (data) => {
            console.log(`OMR Server: ${data}`);
        });
        
        omrServerProcess.stderr.on('data', (data) => {
            console.error(`OMR Server Error: ${data}`);
        });
        
        omrServerProcess.on('close', (code) => {
            console.log(`OMR server exited with code ${code}`);
            omrServerProcess = null;
        });
        
        // Unref so the launcher can exit independently
        omrServerProcess.unref();
        
        res.json({
            success: true,
            message: 'OMR server started successfully',
            pid: omrServerProcess.pid,
            method: 'python'
        });
        
    } catch (error) {
        console.error('❌ Failed to start OMR server:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start OMR server',
            error: error.message
        });
    }
});

// Stop OMR server endpoint
app.post('/stop-omr', (req, res) => {
    if (!omrServerProcess) {
        return res.json({
            success: true,
            message: 'OMR server is not running'
        });
    }
    
    try {
        omrServerProcess.kill();
        omrServerProcess = null;
        
        res.json({
            success: true,
            message: 'OMR server stopped successfully'
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to stop OMR server',
            error: error.message
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start the launcher service
app.listen(PORT, () => {
    console.log(`🚀 OMR Launcher Service running on http://localhost:${PORT}`);
    console.log(`📋 Available endpoints:`);
    console.log(`   GET  /status     - Check launcher and OMR server status`);
    console.log(`   POST /start-omr  - Start the OMR server`);
    console.log(`   POST /stop-omr   - Stop the OMR server`);
    console.log(`   GET  /health     - Health check`);
    console.log(`\n💡 Use this service to control the OMR server from your web application.`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n📋 Shutting down OMR Launcher Service...');
    
    if (omrServerProcess) {
        console.log('🛑 Stopping OMR server...');
        omrServerProcess.kill();
    }
    
    process.exit(0);
});