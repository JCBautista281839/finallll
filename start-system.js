#!/usr/bin/env node
/**
 * Auto-Start System for Viktoria's Bistro POS
 * This script automatically starts both the main server and OMR launcher
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting Viktoria\'s Bistro POS System...');
console.log('='.repeat(50));

// Configuration
const config = {
    mainServer: {
        command: 'node',
        args: ['server.js'],
        port: 5000,
        name: 'Main Server'
    },
    omrLauncher: {
        command: 'node',
        args: ['omr-launcher.js'],
        port: 3001,
        name: 'OMR Launcher'
    }
};

let processes = {};

// Function to start a service
function startService(serviceName, serviceConfig) {
    return new Promise((resolve, reject) => {
        console.log(`🔄 Starting ${serviceConfig.name}...`);
        
        const process = spawn(serviceConfig.command, serviceConfig.args, {
            stdio: ['ignore', 'pipe', 'pipe'],
            detached: false
        });
        
        processes[serviceName] = process;
        
        // Handle output
        process.stdout.on('data', (data) => {
            const output = data.toString().trim();
            if (output) {
                console.log(`[${serviceConfig.name}] ${output}`);
            }
        });
        
        process.stderr.on('data', (data) => {
            const output = data.toString().trim();
            if (output) {
                console.error(`[${serviceConfig.name}] ERROR: ${output}`);
            }
        });
        
        // Handle process events
        process.on('spawn', () => {
            console.log(`✅ ${serviceConfig.name} started successfully (PID: ${process.pid})`);
            resolve(process);
        });
        
        process.on('error', (error) => {
            console.error(`❌ Failed to start ${serviceConfig.name}:`, error.message);
            reject(error);
        });
        
        process.on('exit', (code, signal) => {
            console.log(`⚠️ ${serviceConfig.name} exited (code: ${code}, signal: ${signal})`);
            delete processes[serviceName];
        });
    });
}

// Function to check if port is available
function checkPort(port) {
    return new Promise((resolve) => {
        const { createServer } = require('net');
        const server = createServer();
        
        server.listen(port, () => {
            server.once('close', () => {
                resolve(true); // Port is available
            });
            server.close();
        });
        
        server.on('error', () => {
            resolve(false); // Port is in use
        });
    });
}

// Main startup function
async function startSystem() {
    try {
        console.log('🔍 Checking system requirements...');
        
        // Check if required files exist
        const requiredFiles = ['server.js', 'omr-launcher.js'];
        for (const file of requiredFiles) {
            if (!fs.existsSync(file)) {
                throw new Error(`Required file not found: ${file}`);
            }
        }
        
        console.log('✅ All required files found');
        
        // Check if ports are available
        console.log('🔍 Checking ports...');
        for (const [serviceName, serviceConfig] of Object.entries(config)) {
            const isAvailable = await checkPort(serviceConfig.port);
            if (!isAvailable) {
                console.log(`⚠️ Port ${serviceConfig.port} is already in use (${serviceConfig.name})`);
                console.log(`   This might mean ${serviceConfig.name} is already running.`);
            } else {
                console.log(`✅ Port ${serviceConfig.port} is available (${serviceConfig.name})`);
            }
        }
        
        // Start services
        console.log('\n🚀 Starting services...');
        
        // Start OMR Launcher first
        await startService('omrLauncher', config.omrLauncher);
        
        // Wait a moment before starting main server
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Start Main Server
        await startService('mainServer', config.mainServer);
        
        console.log('\n✅ System startup complete!');
        console.log('='.repeat(50));
        console.log('🌐 Access Points:');
        console.log(`   • Main Application: http://localhost:${config.mainServer.port}`);
        console.log(`   • POS System:       http://localhost:${config.mainServer.port}/html/pos.html`);
        console.log(`   • OMR Launcher:     http://localhost:${config.omrLauncher.port}`);
        console.log(`   • OMR Scanner:      http://localhost:5000 (auto-started when needed)`);
        console.log('\n💡 The OMR scanner will automatically start when you click the scan button in POS.');
        console.log('🔴 Press Ctrl+C to stop all services.');
        
    } catch (error) {
        console.error('❌ System startup failed:', error.message);
        process.exit(1);
    }
}

// Graceful shutdown
function gracefulShutdown() {
    console.log('\n\n🛑 Shutting down system...');
    
    const shutdownPromises = Object.entries(processes).map(([serviceName, process]) => {
        return new Promise((resolve) => {
            const serviceConfig = config[serviceName];
            console.log(`🔄 Stopping ${serviceConfig.name}...`);
            
            process.kill('SIGTERM');
            
            setTimeout(() => {
                if (!process.killed) {
                    console.log(`⚠️ Force killing ${serviceConfig.name}...`);
                    process.kill('SIGKILL');
                }
                resolve();
            }, 5000);
        });
    });
    
    Promise.all(shutdownPromises).then(() => {
        console.log('✅ All services stopped. Goodbye!');
        process.exit(0);
    });
}

// Handle process signals
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown();
});

// Start the system
startSystem();
