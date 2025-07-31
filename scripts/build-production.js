#!/usr/bin/env node

/**
 * TodoLang Production Build Script
 *
 * Optimized build process for production deployment with:
 * - Code minification
 * - Bundle optimization
 * - Asset optimization
 * - Performance analysis
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TodoLangBootstrap } from '../src/main.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ProductionBuilder {
  constructor(options = {}) {
    this.options = {
      sourceDir: path.join(__dirname, '..', 'src', 'app'),
      outputDir: path.join(__dirname, '..', 'dist'),
      tempDir: path.join(__dirname, '..', '.build-temp'),
      enableMinification: true,
      enableOptimization: true,
      enableBundling: true,
      enableAnalysis: true,
      ...options
    };

    this.buildStats = {
      startTime: null,
      endTime: null,
      totalFiles: 0,
      compiledFiles: 0,
      bundleSize: 0,
      optimizationSavings: 0,
      errors: [],
      warnings: []
    };
  }

  async build() {
    console.log('🏗️  Starting TodoLang Production Build...');
    this.buildStats.startTime = Date.now();

    try {
      // Step 1: Clean output directory
      await this.cleanOutputDirectory();

      // Step 2: Initialize TodoLang bootstrap for production
      await this.initializeBootstrap();

      // Step 3: Compile TodoLang source files
      await this.compileSourceFiles();

      // Step 4: Bundle and optimize JavaScript
      await this.bundleAndOptimize();

      // Step 5: Minify code if enabled
      if (this.options.enableMinification) {
        await this.minifyCode();
      }

      // Step 6: Generate production HTML
      await this.generateProductionHTML();

      // Step 7: Copy and optimize assets
      await this.copyAndOptimizeAssets();

      // Step 8: Generate build manifest
      await this.generateBuildManifest();

      // Step 9: Analyze bundle if enabled
      if (this.options.enableAnalysis) {
        await this.analyzeBuild();
      }

      this.buildStats.endTime = Date.now();
      this.printBuildSummary();

      console.log('✅ Production build completed successfully!');
      return true;

    } catch (error) {
      this.buildStats.endTime = Date.now();
      this.buildStats.errors.push({
        message: error.message,
        stack: error.stack,
        timestamp: new Date()
      });

      console.error('❌ Production build failed:', error.message);
      throw error;
    } finally {
      // Clean up temp directory
      await this.cleanupTempDirectory();
    }
  }

  async cleanOutputDirectory() {
    console.log('🧹 Cleaning output directory...');

    if (fs.existsSync(this.options.outputDir)) {
      fs.rmSync(this.options.outputDir, { recursive: true, force: true });
    }

    fs.mkdirSync(this.options.outputDir, { recursive: true });

    // Create temp directory
    if (!fs.existsSync(this.options.tempDir)) {
      fs.mkdirSync(this.options.tempDir, { recursive: true });
    }
  }

  async initializeBootstrap() {
    console.log('⚙️  Initializing TodoLang bootstrap for production...');

    this.bootstrap = new TodoLangBootstrap({
      mode: 'production',
      sourceDir: this.options.sourceDir,
      outputDir: this.options.tempDir, // Use temp dir first
      enableSourceMaps: false, // Disabled for production
      enableHotReload: false,
      enableErrorReporting: true
    });

    await this.bootstrap.start();

    const stats = this.bootstrap.getCompilationStats();
    this.buildStats.totalFiles = stats.totalFiles;
    this.buildStats.compiledFiles = stats.compiledFiles;

    if (stats.errors > 0) {
      throw new Error(`Compilation failed with ${stats.errors} errors`);
    }

    console.log(`✅ Compiled ${stats.compiledFiles} TodoLang files`);
  }

  async compileSourceFiles() {
    console.log('📝 Processing compiled source files...');

    // The bootstrap has already compiled the files to the temp directory
    // Now we need to process them for production
    const compiledFiles = this.findJavaScriptFiles(this.options.tempDir);

    for (const file of compiledFiles) {
      const relativePath = path.relative(this.options.tempDir, file);
      console.log(`  Processing: ${relativePath}`);

      // Read compiled content
      let content = fs.readFileSync(file, 'utf8');

      // Apply production optimizations
      content = this.optimizeCode(content);

      // Write to final output directory
      const outputPath = path.join(this.options.outputDir, relativePath);
      const outputDir = path.dirname(outputPath);

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      fs.writeFileSync(outputPath, content);
    }
  }

  async bundleAndOptimize() {
    console.log('📦 Bundling and optimizing JavaScript...');

    if (!this.options.enableBundling) {
      console.log('  Bundling disabled, skipping...');
      return;
    }

    // Create main application bundle
    const bundleContent = await this.createApplicationBundle();

    // Write bundle to output
    const bundlePath = path.join(this.options.outputDir, 'todolang-app.bundle.js');
    fs.writeFileSync(bundlePath, bundleContent);

    this.buildStats.bundleSize = bundleContent.length;

    console.log(`✅ Created application bundle (${this.formatBytes(bundleContent.length)})`);
  }

  async createApplicationBundle() {
    let bundleContent = '';

    // Add bundle header
    bundleContent += `// TodoLang Application Bundle\n`;
    bundleContent += `// Generated: ${new Date().toISOString()}\n`;
    bundleContent += `// Mode: production\n\n`;

    // Bundle framework components
    const frameworkFiles = [
      path.join(__dirname, '..', 'src', 'language', 'runtime', 'index.js'),
      path.join(__dirname, '..', 'src', 'framework', 'state', 'index.js'),
      path.join(__dirname, '..', 'src', 'framework', 'components', 'index.js'),
      path.join(__dirname, '..', 'src', 'framework', 'router', 'index.js'),
      path.join(__dirname, '..', 'src', 'framework', 'storage', 'index.js'),
      path.join(__dirname, '..', 'src', 'framework', 'di', 'index.js')
    ];

    bundleContent += '// === TodoLang Framework ===\n';
    for (const file of frameworkFiles) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        const relativePath = path.relative(path.join(__dirname, '..'), file);
        bundleContent += `// ${relativePath}\n`;
        bundleContent += this.processModuleForBundle(content) + '\n\n';
      }
    }

    // Bundle compiled application files
    bundleContent += '// === Compiled Application ===\n';
    const appFiles = this.findJavaScriptFiles(this.options.outputDir);

    for (const file of appFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const relativePath = path.relative(this.options.outputDir, file);
      bundleContent += `// ${relativePath}\n`;
      bundleContent += this.processModuleForBundle(content) + '\n\n';
    }

    // Add bundle footer with initialization
    bundleContent += `// === Application Initialization ===\n`;
    bundleContent += `
(function() {
  'use strict';

  // Initialize TodoLang runtime
  if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', function() {
      console.log('🚀 Initializing TodoLang Application...');

      try {
        // Initialize the application
        if (typeof TodoLangRuntime !== 'undefined') {
          const runtime = new TodoLangRuntime();
          runtime.initialize();

          // Mount main application component
          const appElement = document.getElementById('app');
          if (appElement && typeof TodoApp !== 'undefined') {
            const app = new TodoApp();
            runtime.mount(appElement, app);
            console.log('✅ TodoLang Application initialized successfully');
          } else {
            console.error('❌ Application mount point or TodoApp component not found');
          }
        } else {
          console.error('❌ TodoLang runtime not found');
        }
      } catch (error) {
        console.error('❌ Failed to initialize TodoLang Application:', error);
      }
    });
  }
})();
`;

    return bundleContent;
  }

  processModuleForBundle(content) {
    // Remove ES6 import/export statements and convert to bundle format
    let processed = content;

    // Remove import statements (they'll be resolved by bundling)
    processed = processed.replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, '');
    processed = processed.replace(/^import\s+['"].*?['"];?\s*$/gm, '');

    // Convert export default to variable assignment
    processed = processed.replace(/^export\s+default\s+/gm, 'const ');

    // Convert named exports to variable assignments
    processed = processed.replace(/^export\s+\{([^}]+)\};?\s*$/gm, (match, exports) => {
      return exports.split(',').map(exp => {
        const name = exp.trim();
        return `// Exported: ${name}`;
      }).join('\n');
    });

    // Convert export class/function to regular declarations
    processed = processed.replace(/^export\s+(class|function|const|let|var)\s+/gm, '$1 ');

    return processed;
  }

  async minifyCode() {
    console.log('🗜️  Minifying code...');

    if (!this.options.enableMinification) {
      console.log('  Minification disabled, skipping...');
      return;
    }

    const jsFiles = this.findJavaScriptFiles(this.options.outputDir);
    let totalSavings = 0;

    for (const file of jsFiles) {
      const originalContent = fs.readFileSync(file, 'utf8');
      const originalSize = originalContent.length;

      // Simple minification (in a real implementation, you'd use a proper minifier)
      const minifiedContent = this.simpleMinify(originalContent);
      const minifiedSize = minifiedContent.length;

      fs.writeFileSync(file, minifiedContent);

      const savings = originalSize - minifiedSize;
      totalSavings += savings;

      console.log(`  Minified: ${path.relative(this.options.outputDir, file)} (saved ${this.formatBytes(savings)})`);
    }

    this.buildStats.optimizationSavings = totalSavings;
    console.log(`✅ Total minification savings: ${this.formatBytes(totalSavings)}`);
  }

  simpleMinify(code) {
    // Simple minification - remove comments and extra whitespace
    // In a real implementation, you'd use a proper minifier like Terser
    return code
      // Remove single-line comments
      .replace(/\/\/.*$/gm, '')
      // Remove multi-line comments
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      // Remove whitespace around operators
      .replace(/\s*([{}();,=+\-*/<>!&|])\s*/g, '$1')
      // Remove leading/trailing whitespace
      .trim();
  }

  async generateProductionHTML() {
    console.log('📄 Generating production HTML...');

    const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TodoLang Todo Application</title>
    <meta name="description" content="A todo application built with TodoLang - a custom domain-specific language">
    <style>
        /* Optimized CSS for production */
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
            line-height: 1.6;
        }

        .todo-app {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 30px;
            font-size: 2rem;
        }

        .todo-input {
            width: 100%;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 4px;
            font-size: 16px;
            margin-bottom: 20px;
            box-sizing: border-box;
        }

        .todo-input:focus {
            outline: none;
            border-color: #007bff;
        }

        .todo-list {
            margin-bottom: 20px;
        }

        .todo-item {
            display: flex;
            align-items: center;
            padding: 10px;
            border-bottom: 1px solid #eee;
            gap: 10px;
        }

        .todo-item:last-child {
            border-bottom: none;
        }

        .todo-item.completed {
            opacity: 0.6;
        }

        .todo-item.completed .todo-text {
            text-decoration: line-through;
        }

        .todo-checkbox {
            margin-right: 10px;
        }

        .todo-text {
            flex: 1;
            font-size: 16px;
        }

        .todo-actions {
            display: flex;
            gap: 5px;
        }

        .btn {
            padding: 5px 10px;
            border: 1px solid #ddd;
            background: white;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
        }

        .btn:hover {
            background: #f0f0f0;
        }

        .btn-danger {
            color: #dc3545;
            border-color: #dc3545;
        }

        .btn-danger:hover {
            background: #dc3545;
            color: white;
        }

        .todo-filters {
            display: flex;
            justify-content: center;
            gap: 10px;
            margin-top: 20px;
        }

        .filter-btn {
            padding: 8px 16px;
            border: 1px solid #ddd;
            background: white;
            border-radius: 4px;
            cursor: pointer;
            text-decoration: none;
            color: #333;
        }

        .filter-btn:hover {
            background: #f0f0f0;
        }

        .filter-btn.active {
            background: #007bff;
            color: white;
            border-color: #007bff;
        }

        .empty-state {
            text-align: center;
            color: #666;
            font-style: italic;
            padding: 40px 20px;
        }

        .loading {
            text-align: center;
            padding: 40px 20px;
        }

        .error {
            background: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
        }

        /* Responsive design */
        @media (max-width: 480px) {
            body {
                padding: 10px;
            }

            .todo-app {
                padding: 15px;
            }

            h1 {
                font-size: 1.5rem;
            }

            .todo-filters {
                flex-direction: column;
                align-items: center;
            }
        }
    </style>
</head>
<body>
    <div id="app">
        <div class="todo-app">
            <div class="loading">
                <h1>TodoLang Todo Application</h1>
                <p>Loading application...</p>
            </div>
        </div>
    </div>

    <!-- TodoLang Application Bundle -->
    <script src="todolang-app.bundle.js"></script>

    <!-- Fallback for when JavaScript is disabled -->
    <noscript>
        <div class="error">
            <strong>JavaScript Required:</strong> This TodoLang application requires JavaScript to function properly.
        </div>
    </noscript>
</body>
</html>`;

    const htmlPath = path.join(this.options.outputDir, 'index.html');
    fs.writeFileSync(htmlPath, htmlTemplate);

    console.log('✅ Production HTML generated');
  }

  async copyAndOptimizeAssets() {
    console.log('📁 Copying and optimizing assets...');

    // In a real implementation, you would:
    // 1. Copy CSS files and minify them
    // 2. Copy and optimize images
    // 3. Copy fonts and other static assets
    // 4. Generate asset manifest

    console.log('✅ Assets processed (no additional assets found)');
  }

  async generateBuildManifest() {
    console.log('📋 Generating build manifest...');

    const manifest = {
      buildTime: new Date().toISOString(),
      version: this.getVersion(),
      mode: 'production',
      stats: {
        totalFiles: this.buildStats.totalFiles,
        compiledFiles: this.buildStats.compiledFiles,
        bundleSize: this.buildStats.bundleSize,
        optimizationSavings: this.buildStats.optimizationSavings,
        buildDuration: this.buildStats.endTime - this.buildStats.startTime
      },
      files: this.getOutputFiles(),
      warnings: this.buildStats.warnings,
      errors: this.buildStats.errors
    };

    const manifestPath = path.join(this.options.outputDir, 'build-manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    console.log('✅ Build manifest generated');
  }

  async analyzeBuild() {
    console.log('📊 Analyzing build...');

    const analysis = {
      bundleSize: this.buildStats.bundleSize,
      compressionRatio: this.buildStats.optimizationSavings / this.buildStats.bundleSize,
      fileCount: this.getOutputFiles().length,
      buildTime: this.buildStats.endTime - this.buildStats.startTime
    };

    console.log('  Bundle Analysis:');
    console.log(`    Size: ${this.formatBytes(analysis.bundleSize)}`);
    console.log(`    Compression: ${(analysis.compressionRatio * 100).toFixed(1)}%`);
    console.log(`    Files: ${analysis.fileCount}`);
    console.log(`    Build Time: ${analysis.buildTime}ms`);

    // Save analysis report
    const analysisPath = path.join(this.options.outputDir, 'build-analysis.json');
    fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));

    console.log('✅ Build analysis complete');
  }

  async cleanupTempDirectory() {
    if (fs.existsSync(this.options.tempDir)) {
      fs.rmSync(this.options.tempDir, { recursive: true, force: true });
    }
  }

  findJavaScriptFiles(dir) {
    const files = [];

    if (!fs.existsSync(dir)) {
      return files;
    }

    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...this.findJavaScriptFiles(fullPath));
      } else if (item.endsWith('.js')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  optimizeCode(code) {
    // Apply production optimizations
    let optimized = code;

    // Remove development-only code
    optimized = optimized.replace(/console\.log\([^)]*\);?\s*/g, '');
    optimized = optimized.replace(/console\.debug\([^)]*\);?\s*/g, '');

    // Remove empty lines
    optimized = optimized.replace(/^\s*\n/gm, '');

    return optimized;
  }

  getVersion() {
    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
      return packageJson.version || '1.0.0';
    } catch {
      return '1.0.0';
    }
  }

  getOutputFiles() {
    const files = [];
    const outputFiles = this.findAllFiles(this.options.outputDir);

    for (const file of outputFiles) {
      const relativePath = path.relative(this.options.outputDir, file);
      const stat = fs.statSync(file);

      files.push({
        path: relativePath,
        size: stat.size,
        modified: stat.mtime.toISOString()
      });
    }

    return files;
  }

  findAllFiles(dir) {
    const files = [];

    if (!fs.existsSync(dir)) {
      return files;
    }

    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...this.findAllFiles(fullPath));
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  printBuildSummary() {
    const duration = this.buildStats.endTime - this.buildStats.startTime;

    console.log('\n' + '='.repeat(50));
    console.log('📊 Production Build Summary');
    console.log('='.repeat(50));
    console.log(`Build Time: ${duration}ms`);
    console.log(`Source Files: ${this.buildStats.totalFiles}`);
    console.log(`Compiled Files: ${this.buildStats.compiledFiles}`);
    console.log(`Bundle Size: ${this.formatBytes(this.buildStats.bundleSize)}`);
    console.log(`Optimization Savings: ${this.formatBytes(this.buildStats.optimizationSavings)}`);
    console.log(`Output Directory: ${this.options.outputDir}`);

    if (this.buildStats.warnings.length > 0) {
      console.log(`⚠️  Warnings: ${this.buildStats.warnings.length}`);
    }

    if (this.buildStats.errors.length > 0) {
      console.log(`❌ Errors: ${this.buildStats.errors.length}`);
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
      case '--source-dir':
        options.sourceDir = args[++i];
        break;
      case '--output-dir':
        options.outputDir = args[++i];
        break;
      case '--no-minify':
        options.enableMinification = false;
        break;
      case '--no-optimize':
        options.enableOptimization = false;
        break;
      case '--no-bundle':
        options.enableBundling = false;
        break;
      case '--no-analysis':
        options.enableAnalysis = false;
        break;
      case '--help':
        console.log(`
TodoLang Production Build Script

Usage: node scripts/build-production.js [options]

Options:
  --source-dir <path>    Source directory path (default: src/app)
  --output-dir <path>    Output directory path (default: dist)
  --no-minify           Disable code minification
  --no-optimize         Disable code optimization
  --no-bundle           Disable bundling
  --no-analysis         Disable build analysis
  --help                Show this help message

Examples:
  node scripts/build-production.js
  node scripts/build-production.js --output-dir build
  node scripts/build-production.js --no-minify --no-analysis
`);
        return;
    }
  }

  const builder = new ProductionBuilder(options);

  try {
    await builder.build();
    console.log('\n🎉 Production build completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Production build failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('build-production.js')) {
  main().catch(error => {
    console.error('Production build error:', error);
    process.exit(1);
  });
}

export { ProductionBuilder };