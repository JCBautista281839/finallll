#!/usr/bin/env node
/**
 * Development Startup Script - Simplified version for development
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Development Environment...');

// Start OMR Launcher in background
console.log('📋 Starting OMR Launcher...');
const omrLauncher = spawn('node', ['omr-launcher.js'], {
    stdio: 'inherit',
    detached: process.platform !== 'win32'
});

// Wait a moment
setTimeout(() => {
    console.log('🌐 Starting Main Server...');
    
    // Start main server
    const mainServer = spawn('node', ['server.js'], {
        stdio: 'inherit'
    });
    
    // Handle main server exit
    mainServer.on('exit', (code) => {
        console.log('\n🛑 Main server stopped, cleaning up...');
        
        // Kill OMR launcher
        if (!omrLauncher.killed) {
            omrLauncher.kill();
        }
        
        process.exit(code);
    });
    
    // Handle Ctrl+C
    process.on('SIGINT', () => {
        console.log('\n🛑 Stopping all services...');
        
        mainServer.kill();
        if (!omrLauncher.killed) {
            omrLauncher.kill();
        }
        
        process.exit(0);
    });
    
}, 1000);
