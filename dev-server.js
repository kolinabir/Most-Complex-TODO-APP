#!/usr/bin/env node

/**
 * TodoLang Development Server
 *
 * A simple development server for serving the TodoLang application
 * with hot reloading capabilities.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TodoLangBuilder, config } from './build.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TodoLangDevServer {
  constructor(options = {}) {
    this.port = options.port || 3000;
    this.host = options.host || 'localhost';
    this.distDir = options.distDir || path.join(__dirname, 'dist');
    this.builder = new TodoLangBuilder(config);
    this.watchers = new Map();
  }

  async start() {
    console.log('🚀 Starting TodoLang Development Server...');

    // Initialize builder
    await this.builder.init();

    // Initial build with error handling
    try {
      await this.builder.build();
      console.log('✅ Initial build completed');
    } catch (error) {
      console.error('⚠️  Initial build failed:', error.message);
      console.log('📝 Development server will serve production build as fallback');

      // Setup production fallback
      this.setupProductionFallback();
    }

    // Create HTTP server
    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    // Start server
    this.server.listen(this.port, this.host, () => {
      console.log(`✅ TodoLang Dev Server running at http://${this.host}:${this.port}`);
      console.log(`📁 Serving files from: ${this.distDir}`);
      console.log('👀 Watching for file changes...');
    });

    // Setup file watching
    this.setupFileWatcher();

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down TodoLang Dev Server...');
      this.cleanup();
      process.exit(0);
    });
  }

  handleRequest(req, res) {
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = path.join(this.distDir, filePath);

    // Security check - prevent directory traversal
    if (!filePath.startsWith(this.distDir)) {
      this.sendError(res, 403, 'Forbidden');
      return;
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      // For SPA routing, serve index.html for non-existent routes
      if (!path.extname(filePath)) {
        filePath = path.join(this.distDir, 'index.html');
      } else {
        this.sendError(res, 404, 'Not Found');
        return;
      }
    }

    // Determine content type
    const ext = path.extname(filePath);
    const contentType = this.getContentType(ext);

    // Read and serve file
    fs.readFile(filePath, (err, data) => {
      if (err) {
        this.sendError(res, 500, 'Internal Server Error');
        return;
      }

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      res.end(data);
    });

    // Log request
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  }

  getContentType(ext) {
    const types = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon'
    };
    return types[ext] || 'text/plain';
  }

  sendError(res, statusCode, message) {
    res.writeHead(statusCode, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error ${statusCode}</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          h1 { color: #e74c3c; }
        </style>
      </head>
      <body>
        <h1>Error ${statusCode}</h1>
        <p>${message}</p>
        <p><a href="/">Go back to home</a></p>
      </body>
      </html>
    `);
  }

  setupFileWatcher() {
    const watchDirs = [
      path.join(__dirname, 'src'),
      path.join(__dirname, 'build.js')
    ];

    for (const dir of watchDirs) {
      if (fs.existsSync(dir)) {
        this.watchDirectory(dir);
      }
    }
  }

  watchDirectory(dir) {
    try {
      const watcher = fs.watch(dir, { recursive: true }, (eventType, filename) => {
        if (filename) {
          console.log(`📝 File changed: ${filename}`);
          this.handleFileChange(path.join(dir, filename));
        }
      });

      this.watchers.set(dir, watcher);
    } catch (error) {
      console.warn(`⚠️  Could not watch directory: ${dir}`, error.message);
    }
  }

  async handleFileChange(filePath) {
    // Debounce file changes
    clearTimeout(this.rebuildTimeout);
    this.rebuildTimeout = setTimeout(async () => {
      try {
        console.log('🔄 Rebuilding application...');

        // Use the TodoLang bootstrap for hot reloading
        if (filePath.endsWith('.todolang')) {
          await this.handleTodoLangFileChange(filePath);
        } else {
          await this.builder.build();
        }

        console.log('✅ Rebuild complete');

        // Notify connected clients about the change
        this.notifyClients('reload', { file: filePath });

      } catch (error) {
        console.error('❌ Rebuild failed:', error.message);
        this.notifyClients('error', {
          message: error.message,
          stack: error.stack,
          file: filePath
        });
      }
    }, 100);
  }

  async handleTodoLangFileChange(filePath) {
    console.log(`🔥 Hot reloading TodoLang file: ${filePath}`);

    try {
      // Import and use the TodoLang bootstrap for hot reloading
      const { TodoLangBootstrap } = await import('./src/main.js');

      if (!this.bootstrap) {
        this.bootstrap = new TodoLangBootstrap({
          mode: 'development',
          enableHotReload: true,
          enableErrorReporting: true
        });
        await this.bootstrap.start();
      } else {
        // Trigger hot reload for the specific file
        const relativePath = path.relative(path.join(__dirname, 'src', 'app'), filePath);
        await this.bootstrap.recompileFile(relativePath);
      }

    } catch (error) {
      console.error('❌ TodoLang hot reload failed:', error.message);
      throw error;
    }
  }

  setupProductionFallback() {
    console.log('📦 Setting up production build fallback...');

    const deploymentDir = path.join(__dirname, 'deployment');

    if (!fs.existsSync(deploymentDir)) {
      console.error('❌ Production deployment not found. Please run: node scripts/build-production.js');
      return;
    }

    // Ensure dist directory exists
    if (!fs.existsSync(this.distDir)) {
      fs.mkdirSync(this.distDir, { recursive: true });
    }

    try {
      // Copy production files to dist for development serving
      const filesToCopy = ['index.html', 'js', 'sw.js'];

      for (const file of filesToCopy) {
        const srcPath = path.join(deploymentDir, file);
        const destPath = path.join(this.distDir, file);

        if (fs.existsSync(srcPath)) {
          const stat = fs.statSync(srcPath);

          if (stat.isDirectory()) {
            // Copy directory recursively
            this.copyDirectory(srcPath, destPath);
          } else {
            // Copy file
            fs.copyFileSync(srcPath, destPath);
          }
        }
      }

      console.log('✅ Production fallback ready - serving optimized TodoLang application');
      console.log('💡 The production build includes the fully functional todo app');

    } catch (error) {
      console.error('❌ Failed to setup production fallback:', error.message);
    }
  }

  copyDirectory(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const files = fs.readdirSync(src);

    for (const file of files) {
      const srcPath = path.join(src, file);
      const destPath = path.join(dest, file);
      const stat = fs.statSync(srcPath);

      if (stat.isDirectory()) {
        this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  notifyClients(type, data) {
    // In a full implementation, this would use WebSocket or Server-Sent Events
    // to notify browser clients about changes
    console.log(`📡 Notify clients: ${type}`, data);

    // For now, we'll just log the notification
    // In a real implementation, you would:
    // 1. Maintain a list of connected WebSocket clients
    // 2. Send the notification to all connected clients
    // 3. The client-side code would handle the notification (reload, show error, etc.)
  }

  cleanup() {
    // Close file watchers
    for (const [dir, watcher] of this.watchers) {
      watcher.close();
    }
    this.watchers.clear();

    // Close server
    if (this.server) {
      this.server.close();
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--port':
        options.port = parseInt(args[++i]);
        break;
      case '--host':
        options.host = args[++i];
        break;
      case '--help':
        console.log(`
TodoLang Development Server

Usage: node dev-server.js [options]

Options:
  --port <number>    Port to listen on (default: 3000)
  --host <string>    Host to bind to (default: localhost)
  --help            Show this help message

Examples:
  node dev-server.js
  node dev-server.js --port 8080 --host 0.0.0.0
`);
        return;
    }
  }

  const server = new TodoLangDevServer(options);
  await server.start();
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('dev-server.js')) {
  main().catch(error => {
    console.error('Dev server error:', error);
    process.exit(1);
  });
}

export { TodoLangDevServer };