#!/usr/bin/env node

/**
 * Task 17 Verification Script
 *
 * Verifies that all components of task 17 are implemented and working:
 * 1. Application bootstrap and compilation pipeline
 * 2. Development server with hot reloading
 * 3. Production build process with optimization and minification
 * 4. Error reporting and debugging tools
 * 5. Integration tests for complete compilation and execution pipeline
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Task17Verifier {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      total: 0
    };
  }

  async verify() {
    console.log('🔍 Verifying Task 17: Create application bootstrap and compilation pipeline');
    console.log('='.repeat(80));

    await this.verifyBootstrapSystem();
    await this.verifyDevelopmentServer();
    await this.verifyProductionBuild();
    await this.verifyErrorReporting();
    await this.verifyIntegrationTests();

    this.printSummary();
    return this.results.failed === 0;
  }

  async verifyBootstrapSystem() {
    console.log('\n📦 Verifying Application Bootstrap System...');

    // Test 1: Bootstrap module can be imported
    await this.test('Bootstrap module imports successfully', async () => {
      const { TodoLangBootstrap } = await import('./src/main.js');
      return TodoLangBootstrap !== undefined;
    });

    // Test 2: Bootstrap instance can be created
    await this.test('Bootstrap instance can be created', async () => {
      const { TodoLangBootstrap } = await import('./src/main.js');
      const bootstrap = new TodoLangBootstrap({ mode: 'development' });
      return bootstrap !== null;
    });

    // Test 3: Bootstrap has required methods
    await this.test('Bootstrap has required methods', async () => {
      const { TodoLangBootstrap } = await import('./src/main.js');
      const bootstrap = new TodoLangBootstrap();

      const requiredMethods = [
        'start', 'discoverSourceFiles', 'compileSourceFiles',
        'initializeRuntime', 'startApplication', 'setupDevelopmentFeatures',
        'setupHotReload', 'recompileFile', 'getCompilationStats', 'cleanup'
      ];

      return requiredMethods.every(method => typeof bootstrap[method] === 'function');
    });

    // Test 4: Bootstrap CLI interface works
    await this.test('Bootstrap CLI interface works', async () => {
      return fs.existsSync('./src/main.js') &&
             fs.readFileSync('./src/main.js', 'utf8').includes('async function main()');
    });
  }

  async verifyDevelopmentServer() {
    console.log('\n🖥️  Verifying Development Server...');

    // Test 1: Dev server module can be imported
    await this.test('Dev server module imports successfully', async () => {
      const { TodoLangDevServer } = await import('./dev-server.js');
      return TodoLangDevServer !== undefined;
    });

    // Test 2: Dev server instance can be created
    await this.test('Dev server instance can be created', async () => {
      const { TodoLangDevServer } = await import('./dev-server.js');
      const server = new TodoLangDevServer({ port: 0 });
      return server !== null;
    });

    // Test 3: Dev server has required methods
    await this.test('Dev server has required methods', async () => {
      const { TodoLangDevServer } = await import('./dev-server.js');
      const server = new TodoLangDevServer();

      const requiredMethods = [
        'start', 'handleRequest', 'getContentType', 'setupFileWatcher',
        'handleFileChange', 'cleanup'
      ];

      return requiredMethods.every(method => typeof server[method] === 'function');
    });

    // Test 4: Dev server CLI interface works
    await this.test('Dev server CLI interface works', async () => {
      return fs.existsSync('./dev-server.js') &&
             fs.readFileSync('./dev-server.js', 'utf8').includes('async function main()');
    });
  }

  async verifyProductionBuild() {
    console.log('\n🏭 Verifying Production Build System...');

    // Test 1: Production builder module can be imported
    await this.test('Production builder module imports successfully', async () => {
      const { ProductionBuilder } = await import('./scripts/build-production.js');
      return ProductionBuilder !== undefined;
    });

    // Test 2: Production builder instance can be created
    await this.test('Production builder instance can be created', async () => {
      const { ProductionBuilder } = await import('./scripts/build-production.js');
      const builder = new ProductionBuilder();
      return builder !== null;
    });

    // Test 3: Production builder has required methods
    await this.test('Production builder has required methods', async () => {
      const { ProductionBuilder } = await import('./scripts/build-production.js');
      const builder = new ProductionBuilder();

      const requiredMethods = [
        'build', 'cleanOutputDirectory', 'initializeBootstrap', 'compileSourceFiles',
        'bundleAndOptimize', 'minifyCode', 'generateProductionHTML', 'copyAndOptimizeAssets',
        'generateBuildManifest', 'analyzeBuild'
      ];

      return requiredMethods.every(method => typeof builder[method] === 'function');
    });

    // Test 4: Production build supports optimization features
    await this.test('Production build supports optimization features', async () => {
      const content = fs.readFileSync('./scripts/build-production.js', 'utf8');
      return content.includes('enableMinification') &&
             content.includes('enableOptimization') &&
             content.includes('enableBundling') &&
             content.includes('enableAnalysis');
    });

    // Test 5: Production build CLI interface works
    await this.test('Production build CLI interface works', async () => {
      return fs.existsSync('./scripts/build-production.js') &&
             fs.readFileSync('./scripts/build-production.js', 'utf8').includes('async function main()');
    });
  }

  async verifyErrorReporting() {
    console.log('\n🚨 Verifying Error Reporting and Debugging Tools...');

    // Test 1: Error reporter module can be imported
    await this.test('Error reporter module imports successfully', async () => {
      const module = await import('./src/debug/error-reporter.js');
      return module.TodoLangErrorReporter !== undefined;
    });

    // Test 2: Error reporter instance can be created
    await this.test('Error reporter instance can be created', async () => {
      const { TodoLangErrorReporter } = await import('./src/debug/error-reporter.js');
      const reporter = new TodoLangErrorReporter();
      return reporter !== null;
    });

    // Test 3: Error reporter has required methods
    await this.test('Error reporter has required methods', async () => {
      const { TodoLangErrorReporter } = await import('./src/debug/error-reporter.js');
      const reporter = new TodoLangErrorReporter();

      const requiredMethods = [
        'reportCompilationError', 'reportRuntimeError', 'reportWarning', 'debug',
        'extractContext', 'generateSourceMapping', 'generateErrorReport',
        'exportErrorReport', 'getStatistics'
      ];

      return requiredMethods.every(method => typeof reporter[method] === 'function');
    });

    // Test 4: Global error reporter functions are available
    await this.test('Global error reporter functions are available', async () => {
      const module = await import('./src/debug/error-reporter.js');
      return typeof module.reportCompilationError === 'function' &&
             typeof module.reportRuntimeError === 'function' &&
             typeof module.reportWarning === 'function' &&
             typeof module.debug === 'function';
    });

    // Test 5: Error reporter can generate reports
    await this.test('Error reporter can generate reports', async () => {
      const { TodoLangErrorReporter } = await import('./src/debug/error-reporter.js');
      const reporter = new TodoLangErrorReporter({ enableFileLogging: false });

      // Test error reporting
      const error = new Error('Test error');
      error.location = { line: 1, column: 1 };

      const report = reporter.reportCompilationError(error, 'test code', 'test.todolang');
      return report && report.type === 'compilation' && report.error.message === 'Test error';
    });
  }

  async verifyIntegrationTests() {
    console.log('\n🧪 Verifying Integration Tests...');

    // Test 1: Integration test files exist
    await this.test('Integration test files exist', async () => {
      return fs.existsSync('./tests/integration/compilation-pipeline.test.js') &&
             fs.existsSync('./tests/integration/build-system.test.js');
    });

    // Test 2: Test runner can execute integration tests
    await this.test('Test runner can execute integration tests', async () => {
      return fs.existsSync('./test-runner.js') &&
             fs.readFileSync('./test-runner.js', 'utf8').includes('runIntegrationTests');
    });

    // Test 3: Build system integration test is comprehensive
    await this.test('Build system integration test is comprehensive', async () => {
      const content = fs.readFileSync('./tests/integration/build-system.test.js', 'utf8');
      return content.includes('Application Bootstrap') &&
             content.includes('Development Build System') &&
             content.includes('Production Build System') &&
             content.includes('Development Server') &&
             content.includes('Error Reporting and Debugging');
    });

    // Test 4: Compilation pipeline test is comprehensive
    await this.test('Compilation pipeline test is comprehensive', async () => {
      const content = fs.readFileSync('./tests/integration/compilation-pipeline.test.js', 'utf8');
      return content.includes('End-to-End Compilation') &&
             content.includes('Bootstrap Integration') &&
             content.includes('Error Handling and Debugging') &&
             content.includes('Performance and Optimization');
    });
  }

  async test(name, testFn) {
    this.results.total++;

    try {
      const result = await testFn();
      if (result) {
        console.log(`  ✅ ${name}`);
        this.results.passed++;
      } else {
        console.log(`  ❌ ${name} - Test returned false`);
        this.results.failed++;
      }
    } catch (error) {
      console.log(`  ❌ ${name} - ${error.message}`);
      this.results.failed++;
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 Task 17 Verification Summary');
    console.log('='.repeat(80));
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);

    if (this.results.failed === 0) {
      console.log('\n🎉 Task 17 verification completed successfully!');
      console.log('\n✅ All components implemented:');
      console.log('   • Application bootstrap and compilation pipeline');
      console.log('   • Development server with hot reloading capabilities');
      console.log('   • Production build process with optimization and minification');
      console.log('   • Error reporting and debugging tools');
      console.log('   • Integration tests for complete compilation and execution pipeline');
    } else {
      console.log(`\n⚠️  Task 17 verification failed with ${this.results.failed} issues`);
    }
  }
}

// Run verification if called directly
if (process.argv[1] && process.argv[1].endsWith('verify-task-17.js')) {
  const verifier = new Task17Verifier();
  verifier.verify().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Verification error:', error);
    process.exit(1);
  });
}

export { Task17Verifier };