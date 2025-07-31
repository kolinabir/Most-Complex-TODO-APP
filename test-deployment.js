#!/usr/bin/env node

/**
 * Simple test server for the deployment package
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const deploymentDir = path.join(__dirname, 'deployment');
const port = 8080;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.md': 'text/markdown'
};

const server = http.createServer((req, res) => {
  let filePath = path.join(deploymentDir, req.url === '/' ? 'index.html' : req.url);

  // Security check
  if (!filePath.startsWith(deploymentDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('File not found');
      } else {
        res.writeHead(500);
        res.end('Server error');
      }
      return;
    }

    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'text/plain';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });
    res.end(content);
  });
});

server.listen(port, () => {
  console.log(`🚀 TodoLang deployment server running at http://localhost:${port}`);
  console.log(`📁 Serving files from: ${deploymentDir}`);
  console.log('');
  console.log('Open http://localhost:8080 in your browser to test the deployment');
  console.log('Press Ctrl+C to stop the server');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${port} is already in use. Try a different port.`);
  } else {
    console.error('❌ Server error:', err.message);
  }
  process.exit(1);
});