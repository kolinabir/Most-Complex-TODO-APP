#!/usr/bin/env node

/**
 * TodoLang Deployment Package Validator
 *
 * Validates the production deployment package to ensure:
 * - All required files are present
 * - Files have correct content and structure
 * - Bundle sizes are optimized
 * - HTML and JavaScript are valid
 * - Documentation is complete
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.dirname(__dirname);

class DeploymentValidator {
  constructor() {
    this.deploymentDir = path.join(rootDir, 'deployment');
    this.errors = [];
    this.warnings = [];
    this.stats = {
      totalFiles: 0,
      totalSize: 0,
      jsSize: 0,
      htmlSize: 0,
      docsSize: 0
    };
  }

  async validate() {
    console.log('🔍 Validating TodoLang Deployment Package...');
    console.log('');

    try {
      // Step 1: Check required files
      await this.validateRequiredFiles();

      // Step 2: Validate HTML structure
      await this.validateHTML();

      // Step 3: Validate JavaScript bundle
      await this.validateJavaScript();

      // Step 4: Validate polyfills
      await this.validatePolyfills();

      // Step 5: Validate documentation
      await this.validateDocumentation();

      // Step 6: Validate configuration files
      await this.validateConfigFiles();

      // Step 7: Calculate package statistics
      await this.calculateStats();

      // Step 8: Performance analysis
      await this.performanceAnalysis();

      // Step 9: Generate validation report
      await this.generateReport();

      if (this.errors.length === 0) {
        console.log('✅ Deployment package validation PASSED!');
        console.log(`📊 Package ready for production deployment`);
        return true;
      } else {
        console.log(`❌ Deployment package validation FAILED with ${this.errors.length} errors`);
        return false;
      }

    } catch (error) {
      console.error('💥 Validation failed:', error.message);
      return false;
    }
  }

  async validateRequiredFiles() {
    console.log('📁 Validating required files...');

    const requiredFiles = [
      'index.html',
      'js/todolang-app.js',
      'js/polyfills.js',
      'sw.js',
      '.htaccess',
      'robots.txt',
      'docs/DEPLOYMENT.md',
      'docs/SETUP.md',
      'deployment-manifest.json',
      'BUILD-REPORT.md',
      'README.md'
    ];

    const missingFiles = [];
    const presentFiles = [];

    for (const file of requiredFiles) {
      const filePath = path.join(this.deploymentDir, file);
      if (fs.existsSync(filePath)) {
        presentFiles.push(file);
        const stat = fs.statSync(filePath);
        this.stats.totalSize += stat.size;
        this.stats.totalFiles++;
      } else {
        missingFiles.push(file);
      }
    }

    if (missingFiles.length > 0) {
      this.errors.push(`Missing required files: ${missingFiles.join(', ')}`);
    }

    console.log(`  ✅ Found ${presentFiles.length}/${requiredFiles.length} required files`);

    if (missingFiles.length > 0) {
      console.log(`  ❌ Missing files: ${missingFiles.join(', ')}`);
    }
  }

  async validateHTML() {
    console.log('📄 Validating HTML structure...');

    const htmlPath = path.join(this.deploymentDir, 'index.html');

    if (!fs.existsSync(htmlPath)) {
      this.errors.push('index.html not found');
      return;
    }

    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    this.stats.htmlSize = htmlContent.length;

    // Check for required HTML elements
    const requiredElements = [
      '<!DOCTYPE html>',
      '<html lang="en">',
      '<meta charset="UTF-8">',
      '<meta name="viewport"',
      '<title>TodoLang Todo Application</title>',
      '<div id="app">',
      'js/todolang-app.js',
      'js/polyfills.js'
    ];

    const missingElements = [];
    for (const element of requiredElements) {
      if (!htmlContent.includes(element)) {
        missingElements.push(element);
      }
    }

    if (missingElements.length > 0) {
      this.errors.push(`HTML missing required elements: ${missingElements.join(', ')}`);
    }

    // Check for performance optimizations
    const optimizations = [
      { check: 'rel="preload"', name: 'Resource preloading' },
      { check: '<style>', name: 'Inlined critical CSS' },
      { check: 'loading-spinner', name: 'Loading indicator' },
      { check: '<noscript>', name: 'JavaScript fallback' }
    ];

    for (const opt of optimizations) {
      if (!htmlContent.includes(opt.check)) {
        this.warnings.push(`HTML missing optimization: ${opt.name}`);
      }
    }

    console.log(`  ✅ HTML structure validated (${this.formatFileSize(htmlContent.length)})`);
  }

  async validateJavaScript() {
    console.log('📜 Validating JavaScript bundle...');

    const jsPath = path.join(this.deploymentDir, 'js', 'todolang-app.js');

    if (!fs.existsSync(jsPath)) {
      this.errors.push('JavaScript bundle not found');
      return;
    }

    const jsContent = fs.readFileSync(jsPath, 'utf8');
    this.stats.jsSize = jsContent.length;

    // Check for required classes and functions
    const requiredComponents = [
      'TodoApp',
      'StorageService',
      'SimpleRouter',
      'initializeTodoLangApp'
    ];

    const missingComponents = [];
    for (const component of requiredComponents) {
      if (!jsContent.includes(component)) {
        missingComponents.push(component);
      }
    }

    if (missingComponents.length > 0) {
      this.errors.push(`JavaScript missing required components: ${missingComponents.join(', ')}`);
    }

    // Check for basic syntax validity
    try {
      // Basic syntax check - look for unmatched braces
      const openBraces = (jsContent.match(/{/g) || []).length;
      const closeBraces = (jsContent.match(/}/g) || []).length;

      if (openBraces !== closeBraces) {
        this.errors.push(`JavaScript syntax error: Unmatched braces (${openBraces} open, ${closeBraces} close)`);
      }

      const openParens = (jsContent.match(/\(/g) || []).length;
      const closeParens = (jsContent.match(/\)/g) || []).length;

      if (openParens !== closeParens) {
        this.errors.push(`JavaScript syntax error: Unmatched parentheses (${openParens} open, ${closeParens} close)`);
      }

    } catch (error) {
      this.errors.push(`JavaScript validation error: ${error.message}`);
    }

    // Check for production optimizations
    if (jsContent.includes('console.log') && !jsContent.includes('console.error')) {
      this.warnings.push('JavaScript contains debug console.log statements');
    }

    console.log(`  ✅ JavaScript bundle validated (${this.formatFileSize(jsContent.length)})`);
  }

  async validatePolyfills() {
    console.log('🔧 Validating polyfills...');

    const polyfillsPath = path.join(this.deploymentDir, 'js', 'polyfills.js');

    if (!fs.existsSync(polyfillsPath)) {
      this.errors.push('Polyfills file not found');
      return;
    }

    const polyfillsContent = fs.readFileSync(polyfillsPath, 'utf8');

    // Check for required polyfills
    const requiredPolyfills = [
      'Array.prototype.find',
      'Array.prototype.filter',
      'Promise',
      'localStorage'
    ];

    const missingPolyfills = [];
    for (const polyfill of requiredPolyfills) {
      if (!polyfillsContent.includes(polyfill)) {
        missingPolyfills.push(polyfill);
      }
    }

    if (missingPolyfills.length > 0) {
      this.warnings.push(`Polyfills missing: ${missingPolyfills.join(', ')}`);
    }

    console.log(`  ✅ Polyfills validated (${this.formatFileSize(polyfillsContent.length)})`);
  }

  async validateDocumentation() {
    console.log('📚 Validating documentation...');

    const docFiles = [
      'docs/DEPLOYMENT.md',
      'docs/SETUP.md',
      'BUILD-REPORT.md',
      'README.md'
    ];

    let totalDocsSize = 0;

    for (const docFile of docFiles) {
      const docPath = path.join(this.deploymentDir, docFile);

      if (fs.existsSync(docPath)) {
        const content = fs.readFileSync(docPath, 'utf8');
        totalDocsSize += content.length;

        // Check for minimum content length
        if (content.length < 500) {
          this.warnings.push(`Documentation file ${docFile} seems too short (${content.length} chars)`);
        }

        // Check for required sections in main docs
        if (docFile === 'docs/DEPLOYMENT.md') {
          if (!content.includes('Quick Deployment') || !content.includes('Browser Support')) {
            this.warnings.push('DEPLOYMENT.md missing required sections');
          }
        }

        if (docFile === 'docs/SETUP.md') {
          if (!content.includes('Installation') || !content.includes('Troubleshooting')) {
            this.warnings.push('SETUP.md missing required sections');
          }
        }

      } else {
        this.errors.push(`Documentation file missing: ${docFile}`);
      }
    }

    this.stats.docsSize = totalDocsSize;
    console.log(`  ✅ Documentation validated (${this.formatFileSize(totalDocsSize)})`);
  }

  async validateConfigFiles() {
    console.log('⚙️ Validating configuration files...');

    // Validate deployment manifest
    const manifestPath = path.join(this.deploymentDir, 'deployment-manifest.json');
    if (fs.existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

        const requiredFields = ['name', 'version', 'buildTime', 'browserSupport', 'features'];
        const missingFields = requiredFields.filter(field => !manifest[field]);

        if (missingFields.length > 0) {
          this.warnings.push(`Manifest missing fields: ${missingFields.join(', ')}`);
        }

      } catch (error) {
        this.errors.push(`Invalid deployment manifest JSON: ${error.message}`);
      }
    }

    // Validate .htaccess
    const htaccessPath = path.join(this.deploymentDir, '.htaccess');
    if (fs.existsSync(htaccessPath)) {
      const htaccessContent = fs.readFileSync(htaccessPath, 'utf8');

      if (!htaccessContent.includes('mod_deflate') || !htaccessContent.includes('mod_expires')) {
        this.warnings.push('.htaccess missing performance optimizations');
      }
    }

    // Validate service worker
    const swPath = path.join(this.deploymentDir, 'sw.js');
    if (fs.existsSync(swPath)) {
      const swContent = fs.readFileSync(swPath, 'utf8');

      if (!swContent.includes('CACHE_NAME') || !swContent.includes('urlsToCache')) {
        this.warnings.push('Service worker missing required caching logic');
      }
    }

    console.log('  ✅ Configuration files validated');
  }

  async calculateStats() {
    console.log('📊 Calculating package statistics...');

    // Walk through all files to get accurate stats
    const walkDir = (dir) => {
      const files = fs.readdirSync(dir);
      let size = 0;
      let count = 0;

      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          const subStats = walkDir(filePath);
          size += subStats.size;
          count += subStats.count;
        } else {
          size += stat.size;
          count++;
        }
      }

      return { size, count };
    };

    const totalStats = walkDir(this.deploymentDir);
    this.stats.totalSize = totalStats.size;
    this.stats.totalFiles = totalStats.count;

    console.log(`  📁 Total files: ${this.stats.totalFiles}`);
    console.log(`  📦 Total size: ${this.formatFileSize(this.stats.totalSize)}`);
    console.log(`  📜 JavaScript: ${this.formatFileSize(this.stats.jsSize)}`);
    console.log(`  📄 HTML: ${this.formatFileSize(this.stats.htmlSize)}`);
    console.log(`  📚 Documentation: ${this.formatFileSize(this.stats.docsSize)}`);
  }

  async performanceAnalysis() {
    console.log('⚡ Performing performance analysis...');

    // Bundle size analysis
    if (this.stats.jsSize > 50000) { // 50KB
      this.warnings.push(`JavaScript bundle is large (${this.formatFileSize(this.stats.jsSize)})`);
    } else if (this.stats.jsSize < 5000) { // 5KB
      this.warnings.push(`JavaScript bundle seems too small (${this.formatFileSize(this.stats.jsSize)}) - may be missing functionality`);
    }

    // HTML size analysis
    if (this.stats.htmlSize > 20000) { // 20KB
      this.warnings.push(`HTML file is large (${this.formatFileSize(this.stats.htmlSize)}) - consider optimizing`);
    }

    // Total package size analysis
    if (this.stats.totalSize > 100000) { // 100KB
      this.warnings.push(`Total package size is large (${this.formatFileSize(this.stats.totalSize)})`);
    }

    // Performance score estimation
    let performanceScore = 100;

    if (this.stats.jsSize > 30000) performanceScore -= 10;
    if (this.stats.htmlSize > 15000) performanceScore -= 5;
    if (this.stats.totalSize > 75000) performanceScore -= 10;

    console.log(`  🎯 Estimated performance score: ${performanceScore}/100`);
  }

  async generateReport() {
    console.log('📋 Generating validation report...');

    const report = {
      timestamp: new Date().toISOString(),
      status: this.errors.length === 0 ? 'PASSED' : 'FAILED',
      errors: this.errors,
      warnings: this.warnings,
      statistics: this.stats,
      summary: {
        totalFiles: this.stats.totalFiles,
        totalSize: this.formatFileSize(this.stats.totalSize),
        jsSize: this.formatFileSize(this.stats.jsSize),
        htmlSize: this.formatFileSize(this.stats.htmlSize),
        docsSize: this.formatFileSize(this.stats.docsSize),
        errorCount: this.errors.length,
        warningCount: this.warnings.length
      }
    };

    const reportPath = path.join(this.deploymentDir, 'VALIDATION-REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('');
    console.log('📊 VALIDATION SUMMARY');
    console.log('═══════════════════');
    console.log(`Status: ${report.status}`);
    console.log(`Files: ${report.summary.totalFiles}`);
    console.log(`Size: ${report.summary.totalSize}`);
    console.log(`Errors: ${report.summary.errorCount}`);
    console.log(`Warnings: ${report.summary.warningCount}`);

    if (this.errors.length > 0) {
      console.log('');
      console.log('❌ ERRORS:');
      this.errors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
      });
    }

    if (this.warnings.length > 0) {
      console.log('');
      console.log('⚠️  WARNINGS:');
      this.warnings.forEach((warning, i) => {
        console.log(`  ${i + 1}. ${warning}`);
      });
    }

    console.log('');
    console.log(`📄 Full report saved to: VALIDATION-REPORT.json`);
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// CLI interface
async function main() {
  const validator = new DeploymentValidator();

  try {
    const success = await validator.validate();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('Validation failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('validate-deployment.js')) {
  main();
}

export { DeploymentValidator };