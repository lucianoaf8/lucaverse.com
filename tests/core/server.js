/**
 * 🧪 LUCAVERSE TEST STUDIO - UNIFIED SERVER
 * ======================================
 * Single server handling GUI + WebSocket + Test coordination
 * NO separate processes - everything unified
 */

import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { STUDIO_CONFIG, validateConfig } from '../config/studio-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class StudioServer {
  constructor() {
    this.config = STUDIO_CONFIG;
    this.app = express();
    this.server = null;
    this.wss = null;
    this.clients = new Set();
    this.testRunner = null;
    
    this.setupExpress();
    this.setupWebSocket();
  }
  
  setupExpress() {
    // Serve static files
    this.app.use(express.static(path.join(__dirname, '../')));
    
    // Main GUI route
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../gui/index.html'));
    });
    
    // API routes
    this.app.get('/api/config', (req, res) => {
      res.json({
        ports: this.config.ports,
        suites: this.config.tests.suites,
        gui: this.config.gui
      });
    });
    
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy',
        server: 'unified',
        connections: this.clients.size,
        timestamp: new Date().toISOString()
      });
    });
  }
  
  setupWebSocket() {
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ 
      server: this.server,
      path: this.config.server.websocket.path
    });
    
    this.wss.on('connection', (ws, req) => {
      this.log('Client connected', 'info');
      this.clients.add(ws);
      
      // Send initial configuration
      ws.send(JSON.stringify({
        type: 'config',
        data: {
          suites: this.config.tests.suites,
          features: this.config.gui.features
        }
      }));
      
      // Handle messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          this.log(`Invalid message format: ${error.message}`, 'error');
        }
      });
      
      // Handle disconnection
      ws.on('close', () => {
        this.log('Client disconnected', 'info');
        this.clients.delete(ws);
      });
      
      // Handle errors
      ws.on('error', (error) => {
        this.log(`WebSocket error: ${error.message}`, 'error');
        this.clients.delete(ws);
      });
    });
  }
  
  handleMessage(ws, message) {
    const { type, data } = message;
    
    switch (type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;
        
      case 'start_tests':
        this.startTests(data.suites);
        break;
        
      case 'stop_tests':
        this.stopTests();
        break;
        
      case 'get_status':
        this.sendStatus(ws);
        break;
        
      default:
        this.log(`Unknown message type: ${type}`, 'warning');
    }
  }
  
  async startTests(selectedSuites) {
    this.log('Starting test execution', 'info');
    this.broadcast({
      type: 'test_suite_start',
      timestamp: new Date().toISOString(),
      suites: selectedSuites
    });
    
    // Import test runner dynamically to avoid circular dependencies
    if (!this.testRunner) {
      const { TestRunner } = await import('./test-runner.js');
      this.testRunner = new TestRunner(this.config, this.broadcast.bind(this));
    }
    
    this.testRunner.run(selectedSuites);
  }
  
  stopTests() {
    this.log('Stopping test execution', 'info');
    if (this.testRunner) {
      this.testRunner.stop();
    }
    this.broadcast({
      type: 'test_suite_stop',
      timestamp: new Date().toISOString()
    });
  }
  
  sendStatus(ws) {
    ws.send(JSON.stringify({
      type: 'status',
      data: {
        server: 'running',
        clients: this.clients.size,
        tests: this.testRunner?.isRunning() || false,
        timestamp: new Date().toISOString()
      }
    }));
  }
  
  broadcast(message) {
    const payload = JSON.stringify(message);
    this.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(payload);
      }
    });
  }
  
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    console.log(logMessage);
    
    // Broadcast to connected clients
    this.broadcast({
      type: 'log',
      level,
      message,
      timestamp
    });
  }
  
  async start() {
    try {
      validateConfig();
      
      const port = this.config.ports.server;
      
      return new Promise((resolve, reject) => {
        this.server.listen(port, this.config.server.host, () => {
          this.log(`🌐 Unified server started at http://${this.config.server.host}:${port}`, 'success');
          this.log(`🔌 WebSocket ready at ws://${this.config.server.host}:${port}${this.config.server.websocket.path}`, 'success');
          resolve();
        });
        
        this.server.on('error', (error) => {
          if (error.code === 'EADDRINUSE') {
            this.log(`❌ Port ${port} is already in use`, 'error');
          } else {
            this.log(`❌ Server error: ${error.message}`, 'error');
          }
          reject(error);
        });
      });
      
    } catch (error) {
      this.log(`❌ Failed to start server: ${error.message}`, 'error');
      throw error;
    }
  }
  
  async stop() {
    this.log('Shutting down unified server', 'info');
    
    // Close all WebSocket connections
    this.clients.forEach(client => client.close());
    
    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
    }
    
    // Close HTTP server
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(resolve);
      });
    }
  }
}

export default StudioServer;