#!/usr/bin/env node

/**
 * TodoLang Test Runner
 *
 * A custom test runner for TodoLang language components,
 * framework modules, and application functionality.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TodoLangTestRunner {
  constructor() {
    this.testSuites = new Map();
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0
    };
    this.verbose = process.argv.includes('--verbose') || process.argv.includes('-v');
  }

  async run(testTypes = ['all']) {
    console.log('🧪 TodoLang Test Runner Starting...\n');

    if (testTypes.includes('all') || testTypes.includes('lexer')) {
      await this.runLexerTests();
    }

    if (testTypes.includes('all') || testTypes.includes('parser')) {
      await this.runParserTests();
    }

    if (testTypes.includes('all') || testTypes.includes('compiler')) {
      await this.runCompilerTests();
    }

    if (testTypes.includes('all') || testTypes.includes('framework')) {
      await this.runFrameworkTests();
    }

    if (testTypes.includes('all') || testTypes.includes('integration')) {
      await this.runIntegrationTests();
    }

    if (testTypes.includes('all') || testTypes.includes('e2e')) {
      await this.runE2ETests();
    }

    this.printSummary();
    return this.results.failed === 0;
  }

  async runLexerTests() {
    try {
      const { runComprehensiveLexerTests } = await import('./tests/language/lexer-comprehensive.test.js');
      const results = runComprehensiveLexerTests();

      this.results.passed += results.passed;
      this.results.failed += results.failed;
      this.results.total += results.total;
    } catch (error) {
      console.log('❌ Failed to run lexer tests:', error.message);
      this.results.failed++;
      this.results.total++;
    }
  }

  async runParserTests() {
    console.log('🌳 Running Parser Tests...');

    const testSuite = new TestSuite('Parser');

    // Placeholder tests - will be implemented in task 3
    testSuite.addTest('should parse component declarations', () => {
      console.log('  ⏭️  Parser not yet implemented - skipping test');
      return { status: 'skipped', message: 'Parser implementation pending' };
    });

    testSuite.addTest('should parse state declarations', () => {
      console.log('  ⏭️  Parser not yet implemented - skipping test');
      return { status: 'skipped', message: 'Parser implementation pending' };
    });

    testSuite.addTest('should parse JSX elements', () => {
      console.log('  ⏭️  Parser not yet implemented - skipping test');
      return { status: 'skipped', message: 'Parser implementation pending' };
    });

    await this.runTestSuite(testSuite);
  }

  async runCompilerTests() {
    console.log('⚙️  Running Compiler Tests...');

    const testSuite = new TestSuite('Compiler');

    // Placeholder tests - will be implemented in task 4
    testSuite.addTest('should compile components to JavaScript', () => {
      console.log('  ⏭️  Compiler not yet implemented - skipping test');
      return { status: 'skipped', message: 'Compiler implementation pending' };
    });

    testSuite.addTest('should generate source maps', () => {
      console.log('  ⏭️  Compiler not yet implemented - skipping test');
      return { status: 'skipped', message: 'Compiler implementation pending' };
    });

    await this.runTestSuite(testSuite);
  }

  async runFrameworkTests() {
    console.log('🏗️  Running Framework Tests...');

    const testSuite = new TestSuite('Framework');

    // Placeholder tests - will be implemented in tasks 5-10
    testSuite.addTest('should manage reactive state', () => {
      console.log('  ⏭️  State manager not yet implemented - skipping test');
      return { status: 'skipped', message: 'State manager implementation pending' };
    });

    testSuite.addTest('should render virtual DOM', () => {
      console.log('  ⏭️  Virtual DOM not yet implemented - skipping test');
      return { status: 'skipped', message: 'Virtual DOM implementation pending' };
    });

    testSuite.addTest('should handle routing', () => {
      console.log('  ⏭️  Router not yet implemented - skipping test');
      return { status: 'skipped', message: 'Router implementation pending' };
    });

    await this.runTestSuite(testSuite);
  }

  async runIntegrationTests() {
    console.log('🔗 Running Integration Tests...');

    const testSuite = new TestSuite('Integration');

    // Test that the build system works
    testSuite.addTest('should build project successfully', async () => {
      try {
        const { TodoLangBuilder, config } = await import('./build.js');
        const builder = new TodoLangBuilder(config);
        await builder.init();

        console.log('  ✅ Build system initialized successfully');
        return { status: 'passed', message: 'Build system works' };
      } catch (error) {
        return { status: 'failed', message: `Build system error: ${error.message}` };
      }
    });

    // Test that directory structure exists
    testSuite.addTest('should have correct directory structure', () => {
      const requiredDirs = [
        'src/language/lexer',
        'src/language/parser',
        'src/language/compiler',
        'src/language/runtime',
        'src/framework/state',
        'src/framework/components',
        'src/framework/router',
        'src/framework/storage',
        'src/app/components',
        'src/app/models',
        'src/app/services',
        'tests/language',
        'dist'
      ];

      for (const dir of requiredDirs) {
        if (!fs.existsSync(dir)) {
          return { status: 'failed', message: `Missing directory: ${dir}` };
        }
      }

      console.log('  ✅ All required directories exist');
      return { status: 'passed', message: 'Directory structure is correct' };
    });

    // Test that key files exist
    testSuite.addTest('should have required foundation files', () => {
      const requiredFiles = [
        'src/language/grammar.md',
        'src/language/tokens.js',
        'build.js',
        'dev-server.js',
        'package.json'
      ];

      for (const file of requiredFiles) {
        if (!fs.existsSync(file)) {
          return { status: 'failed', message: `Missing file: ${file}` };
        }
      }

      console.log('  ✅ All required foundation files exist');
      return { status: 'passed', message: 'Foundation files are present' };
    });

    await this.runTestSuite(testSuite);
  }

  async runE2ETests() {
    console.log('🎭 Running End-to-End Tests...');

    const testSuite = new TestSuite('E2E');

    // Placeholder tests - will be implemented in task 19
    testSuite.addTest('should load application in browser', () => {
      console.log('  ⏭️  E2E tests not yet implemented - skipping test');
      return { status: 'skipped', message: 'E2E implementation pending' };
    });

    testSuite.addTest('should add todo items', () => {
      console.log('  ⏭️  E2E tests not yet implemented - skipping test');
      return { status: 'skipped', message: 'E2E implementation pending' };
    });

    await this.runTestSuite(testSuite);
  }

  async runTestSuite(testSuite) {
    console.log(`\n--- ${testSuite.name} Test Suite ---`);

    for (const test of testSuite.tests) {
      try {
        const result = await test.fn();

        switch (result.status) {
          case 'passed':
            console.log(`  ✅ ${test.name}`);
            this.results.passed++;
            break;
          case 'failed':
            console.log(`  ❌ ${test.name}: ${result.message}`);
            this.results.failed++;
            break;
          case 'skipped':
            console.log(`  ⏭️  ${test.name}: ${result.message}`);
            this.results.skipped++;
            break;
        }

        this.results.total++;

      } catch (error) {
        console.log(`  ❌ ${test.name}: ${error.message}`);
        this.results.failed++;
        this.results.total++;
      }
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 Test Results Summary');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`⏭️  Skipped: ${this.results.skipped}`);

    if (this.results.failed === 0) {
      console.log('\n🎉 All tests passed!');
    } else {
      console.log(`\n⚠️  ${this.results.failed} test(s) failed`);
    }
  }
}

class TestSuite {
  constructor(name) {
    this.name = name;
    this.tests = [];
  }

  addTest(name, fn) {
    this.tests.push({ name, fn });
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  let testTypes = ['all'];

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--type':
        testTypes = args[++i].split(',');
        break;
      case '--help':
        console.log(`
TodoLang Test Runner

Usage: node test-runner.js [options]

Options:
  --type <types>     Comma-separated list of test types to run
                     Available: lexer, parser, compiler, framework, integration, e2e, all
  --verbose, -v      Verbose output
  --help            Show this help message

Examples:
  node test-runner.js
  node test-runner.js --type lexer,parser
  node test-runner.js --type integration --verbose
`);
        return;
    }
  }

  const runner = new TodoLangTestRunner();
  const success = await runner.run(testTypes);

  process.exit(success ? 0 : 1);
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('test-runner.js')) {
  main().catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}

export { TodoLangTestRunner };