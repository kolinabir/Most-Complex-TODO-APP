#!/usr/bin/env node

/**
 * TodoLang Application Bootstrap
 *
 * Main entry point for the TodoLang application that handles:
 * - Compilation of TodoLang source files
 * - Runtime initialization
 * - Error reporting and debugging
 * - Development vs production mode handling
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TodoLangLexer } from './language/lexer/index.js';
import { TodoLangParser } from './language/parser/index.js';
import { TodoLangCompiler } from './language/compiler/index.js';
import { TodoLangRuntime } from './language/runtime/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Application Bootstrap Class
 */
export class TodoLangBootstrap {
  constructor(options = {}) {
    this.options = {
      mode: process.env.NODE_ENV || 'development',
      sourceDir: path.join(__dirname, 'app'),
      outputDir: path.join(__dirname, '..', 'dist'),
      enableSourceMaps: true,
      enableHotReload: false,
      enableErrorReporting: true,
      ...options
    };

    this.lexer = new TodoLangLexer();
    this.parser = new TodoLangParser();
    this.compiler = new TodoLangCompiler({
      generateSourceMaps: this.options.enableSourceMaps,
      minify: this.options.mode === 'production'
    });
    this.runtime = new TodoLangRuntime();

    this.compilationErrors = [];
    this.runtimeErrors = [];
    this.sourceFiles = new Map();
    this.compiledModules = new Map();
  }

  /**
   * Initialize and start the TodoLang application
   */
  async start() {
    try {
      console.log('🚀 Starting TodoLang Application Bootstrap...');
      console.log(`📁 Mode: ${this.options.mode}`);
      console.log(`📂 Source Directory: ${this.options.sourceDir}`);
      console.log(`📦 Output Directory: ${this.options.outputDir}`);

      // Step 1: Discover and load source files
      await this.discoverSourceFiles();

      // Step 2: Compile TodoLang source files
      await this.compileSourceFiles();

      // Step 3: Initialize runtime environment
      await this.initializeRuntime();

      // Step 4: Start the application
      await this.startApplication();

      console.log('✅ TodoLang Application started successfully!');

      // Step 5: Setup development features if needed
      if (this.options.mode === 'development') {
        await this.setupDevelopmentFeatures();
      }

      return true;

    } catch (error) {
      console.error('❌ Failed to start TodoLang Application:', error.message);

      if (this.options.enableErrorReporting) {
        this.reportError(error);
      }

      throw error;
    }
  }

  /**
   * Discover all TodoLang source files
   */
  async discoverSourceFiles() {
    console.log('🔍 Discovering TodoLang source files...');

    const sourceFiles = this.findTodoLangFiles(this.options.sourceDir);

    for (const filePath of sourceFiles) {
      const relativePath = path.relative(this.options.sourceDir, filePath);
      const sourceCode = fs.readFileSync(filePath, 'utf8');

      this.sourceFiles.set(relativePath, {
        absolutePath: filePath,
        relativePath,
        sourceCode,
        lastModified: fs.statSync(filePath).mtime
      });

      console.log(`  📄 Found: ${relativePath}`);
    }

    console.log(`✅ Discovered ${sourceFiles.length} TodoLang source files`);
  }

  /**
   * Compile all TodoLang source files
   */
  async compileSourceFiles() {
    console.log('🔨 Compiling TodoLangs...');

    this.compilationErrors = [];

    for (const [relativePath, fileInfo] of this.sourceFiles) {
      try {
        console.log(`  📝 Compiling: ${relativePath}`);

        // Step 1: Tokenize
        const tokens = this.lexer.tokenize(fileInfo.sourceCode);

        // Step 2: Parse to AST
        const ast = this.parser.parse(tokens);

        // Step 3: Compile to JavaScript
        const compilationResult = this.compiler.compile(ast);

        // Store compiled module
        this.compiledModules.set(relativePath, {
          ...fileInfo,
          tokens,
          ast,
          compiledCode: compilationResult.code,
          sourceMap: compilationResult.sourceMap,
          compiledAt: new Date()
        });

        // Write compiled output if in build mode
        if (this.options.outputDir) {
          await this.writeCompiledOutput(relativePath, compilationResult);
        }

        console.log(`    ✅ Compiled successfully`);

      } catch (error) {
        const compilationError = {
          file: relativePath,
          error: error.message,
          location: error.location,
          stack: error.stack,
          timestamp: new Date()
        };

        this.compilationErrors.push(compilationError);

        console.error(`    ❌ Compilation failed: ${error.message}`);

        if (error.location) {
          console.error(`       at line ${error.location.line}, column ${error.location.column}`);
        }
      }
    }

    if (this.compilationErrors.length > 0) {
      console.error(`❌ Compilation completed with ${this.compilationErrors.length} errors`);

      if (this.options.mode === 'production') {
        throw new Error(`Compilation failed with ${this.compilationErrors.length} errors`);
      }
    } else {
      console.log('✅ All source files compiled successfully');
    }
  }

  /**
   * Write compiled output to disk
   */
  async writeCompiledOutput(relativePath, compilationResult) {
    const outputPath = path.join(
      this.options.outputDir,
      relativePath.replace('.todolang', '.js')
    );

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write compiled JavaScript
    fs.writeFileSync(outputPath, compilationResult.code);

    // Write source map if enabled
    if (compilationResult.sourceMap && this.options.enableSourceMaps) {
      const sourceMapPath = outputPath + '.map';
      fs.writeFileSync(sourceMapPath, JSON.stringify(compilationResult.sourceMap, null, 2));

      // Add source map reference to compiled code
      const codeWithSourceMap = compilationResult.code + `\n//# sourceMappingURL=${path.basename(sourceMapPath)}`;
      fs.writeFileSync(outputPath, codeWithSourceMap);
    }
  }

  /**
   * Initialize the TodoLang runtime environment
   */
  async initializeRuntime() {
    console.log('⚙️  Initializing TodoLang runtime...');

    try {
      // Initialize runtime with compiled modules
      await this.runtime.initialize({
        modules: this.compiledModules,
        mode: this.options.mode,
        enableDebugging: this.options.mode === 'development'
      });

      // Setup error handling
      this.runtime.onError((error) => {
        this.runtimeErrors.push({
          error: error.message,
          stack: error.stack,
          timestamp: new Date()
        });

        if (this.options.enableErrorReporting) {
          this.reportRuntimeError(error);
        }
      });

      console.log('✅ TodoLang runtime initialized');

    } catch (error) {
      console.error('❌ Failed to initialize runtime:', error.message);
      throw error;
    }
  }

  /**
   * Start the actual TodoLang application
   */
  async startApplication() {
    console.log('🎯 Starting TodoLang application...');

    try {
      // Load and execute the main application component
      const mainComponent = this.compiledModules.get('components/index.todolang');

      if (!mainComponent) {
        throw new Error('Main application component not found (components/index.todolang)');
      }

      // Execute the compiled application code in the runtime
      await this.runtime.execute(mainComponent.compiledCode);

      // Mount the application to the DOM if in browser environment
      if (typeof window !== 'undefined') {
        await this.mountApplication();
      }

      console.log('✅ TodoLang application started');

    } catch (error) {
      console.error('❌ Failed to start application:', error.message);
      throw error;
    }
  }

  /**
   * Mount the application to the DOM
   */
  async mountApplication() {
    console.log('🔗 Mounting application to DOM...');

    try {
      const appElement = document.getElementById('app');

      if (!appElement) {
        throw new Error('Application mount point not found (element with id="app")');
      }

      // Use runtime to mount the main component
      await this.runtime.mount(appElement);

      console.log('✅ Application mounted to DOM');

    } catch (error) {
      console.error('❌ Failed to mount application:', error.message);
      throw error;
    }
  }

  /**
   * Setup development features like hot reloading
   */
  async setupDevelopmentFeatures() {
    console.log('🛠️  Setting up development features...');

    if (this.options.enableHotReload) {
      await this.setupHotReload();
    }

    // Setup development error overlay
    this.setupErrorOverlay();

    // Setup performance monitoring
    this.setupPerformanceMonitoring();

    console.log('✅ Development features enabled');
  }

  /**
   * Setup hot reloading for development
   */
  async setupHotReload() {
    console.log('🔥 Setting up hot reload...');

    // Watch source files for changes
    for (const [relativePath, fileInfo] of this.sourceFiles) {
      fs.watchFile(fileInfo.absolutePath, { interval: 1000 }, async (curr, prev) => {
        if (curr.mtime > prev.mtime) {
          console.log(`🔄 File changed: ${relativePath}`);
          await this.recompileFile(relativePath);
        }
      });
    }

    console.log('✅ Hot reload enabled');
  }

  /**
   * Recompile a single file for hot reloading
   */
  async recompileFile(relativePath) {
    try {
      const fileInfo = this.sourceFiles.get(relativePath);

      if (!fileInfo) {
        console.error(`❌ File not found for recompilation: ${relativePath}`);
        return;
      }

      // Read updated source code
      const updatedSourceCode = fs.readFileSync(fileInfo.absolutePath, 'utf8');
      fileInfo.sourceCode = updatedSourceCode;
      fileInfo.lastModified = new Date();

      // Recompile
      const tokens = this.lexer.tokenize(updatedSourceCode);
      const ast = this.parser.parse(tokens);
      const compilationResult = this.compiler.compile(ast);

      // Update compiled module
      this.compiledModules.set(relativePath, {
        ...fileInfo,
        tokens,
        ast,
        compiledCode: compilationResult.code,
        sourceMap: compilationResult.sourceMap,
        compiledAt: new Date()
      });

      // Hot reload in runtime
      await this.runtime.hotReload(relativePath, compilationResult.code);

      console.log(`✅ Hot reloaded: ${relativePath}`);

    } catch (error) {
      console.error(`❌ Hot reload failed for ${relativePath}:`, error.message);
      this.showErrorOverlay(error);
    }
  }

  /**
   * Setup error overlay for development
   */
  setupErrorOverlay() {
    if (typeof window === 'undefined') return;

    // Create error overlay element
    const overlay = document.createElement('div');
    overlay.id = 'todolang-error-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      font-family: monospace;
      font-size: 14px;
      padding: 20px;
      box-sizing: border-box;
      z-index: 9999;
      overflow: auto;
      display: none;
    `;

    document.body.appendChild(overlay);

    // Setup global error handler
    window.addEventListener('error', (event) => {
      this.showErrorOverlay(event.error);
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.showErrorOverlay(event.reason);
    });
  }

  /**
   * Show error overlay
   */
  showErrorOverlay(error) {
    if (typeof window === 'undefined') return;

    const overlay = document.getElementById('todolang-error-overlay');
    if (!overlay) return;

    const errorHtml = `
      <div style="margin-bottom: 20px;">
        <h2 style="color: #ff6b6b; margin: 0 0 10px 0;">TodoLang Compilation Error</h2>
        <button onclick="this.parentElement.parentElement.style.display='none'"
                style="float: right; background: #333; color: white; border: none; padding: 5px 10px; cursor: pointer;">
          Close
        </button>
      </div>
      <div style="background: #1a1a1a; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
        <strong>Error:</strong> ${error.message || error}
      </div>
      ${error.stack ? `
        <div style="background: #1a1a1a; padding: 15px; border-radius: 5px;">
          <strong>Stack Trace:</strong>
          <pre style="margin: 10px 0 0 0; white-space: pre-wrap;">${error.stack}</pre>
        </div>
      ` : ''}
      ${this.compilationErrors.length > 0 ? `
        <div style="background: #1a1a1a; padding: 15px; border-radius: 5px; margin-top: 15px;">
          <strong>Compilation Errors:</strong>
          ${this.compilationErrors.map(err => `
            <div style="margin: 10px 0; padding: 10px; background: #2a2a2a; border-radius: 3px;">
              <strong>${err.file}:</strong> ${err.error}
              ${err.location ? `<br><small>Line ${err.location.line}, Column ${err.location.column}</small>` : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;

    overlay.innerHTML = errorHtml;
    overlay.style.display = 'block';
  }

  /**
   * Setup performance monitoring
   */
  setupPerformanceMonitoring() {
    if (typeof window === 'undefined') return;

    // Monitor compilation performance
    const compilationTimes = Array.from(this.compiledModules.values()).map(module => ({
      file: module.relativePath,
      compilationTime: module.compiledAt - new Date(module.lastModified)
    }));

    console.log('📊 Compilation Performance:', compilationTimes);

    // Setup runtime performance monitoring
    this.runtime.onPerformanceMetric((metric) => {
      console.log(`📈 Performance: ${metric.name} - ${metric.value}ms`);
    });
  }

  /**
   * Find all TodoLang files in a directory
   */
  findTodoLangFiles(dir) {
    const files = [];

    if (!fs.existsSync(dir)) {
      return files;
    }

    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...this.findTodoLangFiles(fullPath));
      } else if (item.endsWith('.todolang')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Report compilation or runtime errors
   */
  reportError(error) {
    const errorReport = {
      timestamp: new Date().toISOString(),
      type: 'bootstrap_error',
      message: error.message,
      stack: error.stack,
      compilationErrors: this.compilationErrors,
      runtimeErrors: this.runtimeErrors,
      environment: {
        mode: this.options.mode,
        nodeVersion: process.version,
        platform: process.platform
      }
    };

    // Log to console
    console.error('📋 Error Report:', JSON.stringify(errorReport, null, 2));

    // In development, show detailed error information
    if (this.options.mode === 'development') {
      this.showErrorOverlay(error);
    }

    // In production, you might want to send this to an error reporting service
    if (this.options.mode === 'production') {
      // Example: send to error reporting service
      // this.sendErrorReport(errorReport);
    }
  }

  /**
   * Report runtime errors
   */
  reportRuntimeError(error) {
    console.error('🚨 Runtime Error:', error.message);

    if (this.options.mode === 'development') {
      this.showErrorOverlay(error);
    }
  }

  /**
   * Get compilation statistics
   */
  getCompilationStats() {
    return {
      totalFiles: this.sourceFiles.size,
      compiledFiles: this.compiledModules.size,
      errors: this.compilationErrors.length,
      runtimeErrors: this.runtimeErrors.length,
      compilationTime: Array.from(this.compiledModules.values())
        .reduce((total, module) => total + (module.compiledAt - new Date(module.lastModified)), 0)
    };
  }

  /**
   * Clean up resources
   */
  cleanup() {
    console.log('🧹 Cleaning up TodoLang Bootstrap...');

    // Stop watching files
    for (const [, fileInfo] of this.sourceFiles) {
      fs.unwatchFile(fileInfo.absolutePath);
    }

    // Cleanup runtime
    if (this.runtime) {
      this.runtime.cleanup();
    }

    console.log('✅ Cleanup complete');
  }
}

/**
 * CLI interface for running the bootstrap
 */
async function main() {
  const args = process.argv.slice(2);
  const options = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--mode':
        options.mode = args[++i];
        break;
      case '--source-dir':
        options.sourceDir = args[++i];
        break;
      case '--output-dir':
        options.outputDir = args[++i];
        break;
      case '--no-source-maps':
        options.enableSourceMaps = false;
        break;
      case '--hot-reload':
        options.enableHotReload = true;
        break;
      case '--no-error-reporting':
        options.enableErrorReporting = false;
        break;
      case '--help':
        console.log(`
TodoLang Application Bootstrap

Usage: node src/main.js [options]

Options:
  --mode <mode>              Set mode (development|production)
  --source-dir <path>        Source directory path
  --output-dir <path>        Output directory path
  --no-source-maps          Disable source map generation
  --hot-reload              Enable hot reloading (development only)
  --no-error-reporting      Disable error reporting
  --help                    Show this help message

Examples:
  node src/main.js --mode development --hot-reload
  node src/main.js --mode production --output-dir dist
`);
        return;
    }
  }

  const bootstrap = new TodoLangBootstrap(options);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down TodoLang Bootstrap...');
    bootstrap.cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down TodoLang Bootstrap...');
    bootstrap.cleanup();
    process.exit(0);
  });

  try {
    await bootstrap.start();

    // Keep the process running in development mode
    if (options.mode === 'development' || options.enableHotReload) {
      console.log('👀 Watching for changes... (Press Ctrl+C to exit)');

      // Keep process alive
      setInterval(() => {
        // Check for any runtime errors and report them
        const stats = bootstrap.getCompilationStats();
        if (stats.runtimeErrors > 0) {
          console.log(`⚠️  Runtime errors detected: ${stats.runtimeErrors}`);
        }
      }, 30000); // Check every 30 seconds
    }

  } catch (error) {
    console.error('💥 Bootstrap failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('main.js')) {
  main().catch(error => {
    console.error('Bootstrap error:', error);
    process.exit(1);
  });
}

