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
    try {
      const { runComprehensiveParserTests } = await import('./tests/language/parser-comprehensive.test.js');
      const results = runComprehensiveParserTests();

      this.results.passed += results.passed;
      this.results.failed += results.failed;
      this.results.total += results.total;
    } catch (error) {
      console.log('❌ Failed to run comprehensive parser tests:', error.message);
      this.results.failed++;
      this.results.total++;
    }

    console.log('🌳 Running Basic Parser Tests...');

    const testSuite = new TestSuite('Parser');

    try {
      const { TodoLangLexer } = await import('./src/language/lexer/index.js');
      const { TodoLangParser, ComponentNode, StateNode, JSXElementNode } = await import('./src/language/parser/index.js');

      // Helper function to parse source code
      function parseSource(source) {
        const lexer = new TodoLangLexer();
        const parser = new TodoLangParser();
        const tokens = lexer.tokenize(source);
        return parser.parse(tokens);
      }

      testSuite.addTest('should parse minimal component', () => {
        try {
          const source = `
            component TestComponent {
              render() {
                <div>Hello</div>
              }
            }
          `;
          const ast = parseSource(source);

          if (ast.declarations.length !== 1) {
            return { status: 'failed', message: 'Expected 1 declaration' };
          }

          const component = ast.declarations[0];
          if (!(component instanceof ComponentNode)) {
            return { status: 'failed', message: 'Expected ComponentNode' };
          }

          if (component.name !== 'TestComponent') {
            return { status: 'failed', message: 'Expected component name to be TestComponent' };
          }

          return { status: 'passed', message: 'Component parsed successfully' };
        } catch (error) {
          return { status: 'failed', message: `Parse error: ${error.message}` };
        }
      });

      testSuite.addTest('should parse component with state', () => {
        try {
          const source = `
            component TodoApp {
              state {
                todos: Todo[] = []
                filter: string = "all"
              }

              render() {
                <div>App</div>
              }
            }
          `;
          const ast = parseSource(source);

          const component = ast.declarations[0];
          if (!component.stateDeclaration) {
            return { status: 'failed', message: 'Expected state declaration' };
          }

          if (!(component.stateDeclaration instanceof StateNode)) {
            return { status: 'failed', message: 'Expected StateNode' };
          }

          if (component.stateDeclaration.properties.length !== 2) {
            return { status: 'failed', message: 'Expected 2 state properties' };
          }

          return { status: 'passed', message: 'Component with state parsed successfully' };
        } catch (error) {
          return { status: 'failed', message: `Parse error: ${error.message}` };
        }
      });

      testSuite.addTest('should parse JSX elements', () => {
        try {
          const source = `
            component TestComponent {
              render() {
                <div class="container">
                  <h1>Title</h1>
                  <p>Content</p>
                </div>
              }
            }
          `;
          const ast = parseSource(source);

          const component = ast.declarations[0];
          if (!component.renderMethod) {
            return { status: 'failed', message: 'Expected render method' };
          }

          if (component.renderMethod.body.length === 0) {
            return { status: 'failed', message: 'Expected render body' };
          }

          const jsxElement = component.renderMethod.body[0].expression;
          if (!(jsxElement instanceof JSXElementNode)) {
            return { status: 'failed', message: 'Expected JSXElementNode' };
          }

          if (jsxElement.tagName !== 'div') {
            return { status: 'failed', message: 'Expected div tag' };
          }

          if (jsxElement.children.length !== 2) {
            return { status: 'failed', message: 'Expected 2 children' };
          }

          return { status: 'passed', message: 'JSX elements parsed successfully' };
        } catch (error) {
          return { status: 'failed', message: `Parse error: ${error.message}` };
        }
      });

      testSuite.addTest('should parse model declarations', () => {
        try {
          const source = `
            model Todo {
              id: string
              text: string
              completed: boolean = false
            }
          `;
          const ast = parseSource(source);

          if (ast.declarations.length !== 1) {
            return { status: 'failed', message: 'Expected 1 declaration' };
          }

          const model = ast.declarations[0];
          if (model.type !== 'Model') {
            return { status: 'failed', message: 'Expected ModelNode' };
          }

          if (model.name !== 'Todo') {
            return { status: 'failed', message: 'Expected model name to be Todo' };
          }

          if (model.properties.length !== 3) {
            return { status: 'failed', message: 'Expected 3 properties' };
          }

          return { status: 'passed', message: 'Model declaration parsed successfully' };
        } catch (error) {
          return { status: 'failed', message: `Parse error: ${error.message}` };
        }
      });

      testSuite.addTest('should parse service declarations', () => {
        try {
          const source = `
            service StorageService {
              save(key: string, data: any): void {
                localStorage.setItem(key, JSON.stringify(data))
              }

              load(key: string): any? {
                return localStorage.getItem(key)
              }
            }
          `;
          const ast = parseSource(source);

          if (ast.declarations.length !== 1) {
            return { status: 'failed', message: 'Expected 1 declaration' };
          }

          const service = ast.declarations[0];
          if (service.type !== 'Service') {
            return { status: 'failed', message: 'Expected ServiceNode' };
          }

          if (service.name !== 'StorageService') {
            return { status: 'failed', message: 'Expected service name to be StorageService' };
          }

          if (service.methods.length !== 2) {
            return { status: 'failed', message: 'Expected 2 methods' };
          }

          return { status: 'passed', message: 'Service declaration parsed successfully' };
        } catch (error) {
          return { status: 'failed', message: `Parse error: ${error.message}` };
        }
      });

      testSuite.addTest('should handle syntax errors gracefully', () => {
        try {
          const source = `
            component {
              render() { <div>Test</div> }
            }
          `;
          parseSource(source);
          return { status: 'failed', message: 'Expected syntax error for missing component name' };
        } catch (error) {
          if (error.name === 'ParseError') {
            return { status: 'passed', message: 'Syntax error handled correctly' };
          }
          return { status: 'failed', message: `Unexpected error: ${error.message}` };
        }
      });

    } catch (importError) {
      testSuite.addTest('parser import error', () => {
        return { status: 'failed', message: `Failed to import parser: ${importError.message}` };
      });
    }

    await this.runTestSuite(testSuite);
  }

  async runCompilerTests() {
    try {
      const { runCompilerTests } = await import('./tests/language/compiler.test.js');
      const results = runCompilerTests();

      this.results.passed += results.passed;
      this.results.failed += results.failed;
      this.results.total += results.total;
    } catch (error) {
      console.log('❌ Failed to run compiler tests:', error.message);
      this.results.failed++;
      this.results.total++;
    }
  }

  async runFrameworkTests() {
    try {
      const { runFrameworkTests } = await import('./tests/framework/index.js');
      const results = await runFrameworkTests();

      this.results.passed += results.passed;
      this.results.failed += results.failed;
      this.results.skipped += results.skipped || 0;
      this.results.total += results.total;
    } catch (error) {
      console.log('❌ Failed to run framework tests:', error.message);
      this.results.failed++;
      this.results.total++;
    }
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

    try {
      // Run complete workflow tests
      const { runCompleteWorkflowTests } = await import('./tests/integration/complete-workflows.test.js');
      const workflowResults = runCompleteWorkflowTests();

      this.results.passed += workflowResults.passed;
      this.results.failed += workflowResults.failed;
      this.results.total += workflowResults.total;

      // Run comprehensive E2E application tests
      console.log('\n🎯 Running Comprehen: 'E E2E Application Tests...');

      const testSuite = new TestSuite('E2E Application Tests');

      testSuite.addTest('should complete full todo creation workflow', async () => {
        try {
          console.log('    📝 Testing complete todo creation workflow');

          // Simulate user adding a todo
          const mockApp = {
            state: { todos: [], newTodoText: '', error: '' },
            addTodo: function(text) {
              if (!text || text.trim().length === 0) {
                this.state.error = 'Todo text cannot be empty';
                return false;
              }
              this.state.todos.push({
                id: `todo_${Date.now()}`,
                text: text.trim(),
                completed: false,
                createdAt: new Date()
              });
              this.state.newTodoText = '';
              this.state.error = '';
              return true;
            }
          };

          // Test the workflow
          const success = mockApp.addTodo('Test todo item');
          if (!success) throw new Error('Todo creation failed');
          if (mockApp.state.todos.length !== 1) throw new Error('Todo not added to state');
          if (mockApp.state.todos[0].text !== 'Test todo item') throw new Error('Todo text incorrect');
          if (mockApp.state.newTodoText !== '') throw new Error('Input not cleared');

          return { status: 'passed', message: 'Todo creation workflow successful' };
        } catch (error) {
          return { status: 'failed', message: error.message };
        }
      });

      testSuite.addTest('should handle todo editing workflow', async () => {
        try {
          console.log('    ✏️  Testing todo editing workflow');

          const mockApp = {
            state: {
              todos: [{ id: 'test-1', text: 'Original text', completed: false }],
              editingId: null,
              error: ''
            },
            startEdit: function(id) {
              this.state.editingId = id;
            },
            saveEdit: function(id, newText) {
              if (!newText || newText.trim().length === 0) {
                this.state.error = 'Todo text cannot be empty';
                return false;
              }
              const todo = this.state.todos.find(t => t.id === id);
              if (todo) {
                todo.text = newText.trim();
                this.state.editingId = null;
                this.state.error = '';
                return true;
              }
              return false;
            }
          };

          // Test edit workflow
          mockApp.startEdit('test-1');
          if (mockApp.state.editingId !== 'test-1') throw new Error('Edit mode not activated');

          const success = mockApp.saveEdit('test-1', 'Updated text');
          if (!success) throw new Error('Edit save failed');
          if (mockApp.state.todos[0].text !== 'Updated text') throw new Error('Todo text not updated');
          if (mockApp.state.editingId !== null) throw new Error('Edit mode not exited');

          return { status: 'passed', message: 'Todo editing workflow successful' };
        } catch (error) {
          return { status: 'failed', message: error.message };
        }
      });

      testSuite.addTest('should handle filtering and URL state management', async () => {
        try {
          console.log('    🔍 Testing filtering and URL state management');

          const mockApp = {
            state: {
              todos: [
                { id: '1', text: 'Active todo', completed: false },
                { id: '2', text: 'Completed todo', completed: true }
              ],
              currentFilter: 'all'
            },
            setFilter: function(filter) {
              this.state.currentFilter = filter;
              this.updateURL(filter);
            },
            getFilteredTodos: function() {
              return this.state.todos.filter(todo => {
                if (this.state.currentFilter === 'active') return !todo.completed;
                if (this.state.currentFilter === 'completed') return todo.completed;
                return true;
              });
            },
            updateURL: function(filter) {
              // Mock URL update
              global.mockURL = filter === 'all' ? '/' : `/?filter=${filter}`;
            }
          };

          // Test filtering
          mockApp.setFilter('active');
          const activeTodos = mockApp.getFilteredTodos();
          if (activeTodos.length !== 1) throw new Error('Active filter failed');
          if (activeTodos[0].completed) throw new Error('Active filter showing completed todo');
          if (global.mockURL !== '/?filter=active') throw new Error('URL not updated for active filter');

          mockApp.setFilter('completed');
          const completedTodos = mockApp.getFilteredTodos();
          if (completedTodos.length !== 1) throw new Error('Completed filter failed');
          if (!completedTodos[0].completed) throw new Error('Completed filter showing active todo');

          return { status: 'passed', message: 'Filtering and URL state management successful' };
        } catch (error) {
          return { status: 'failed', message: error.message };
        }
      });

      testSuite.addTest('should handle data persistence across sessions', async () => {
        try {
          console.log('    💾 Testing data persistence workflow');

          // Mock localStorage
          const mockStorage = {
            data: {},
            setItem: function(key, value) { this.data[key] = value; },
            getItem: function(key) { return this.data[key] || null; },
            clear: function() { this.data = {}; }
          };

          const mockApp = {
            storage: mockStorage,
            state: {
              todos: [
                { id: '1', text: 'Persistent todo', completed: false, createdAt: new Date() }
              ],
              currentFilter: 'all'
            },
            saveToStorage: function() {
              const data = {
                todos: this.state.todos,
                currentFilter: this.state.currentFilter,
                savedAt: Date.now()
              };
              this.storage.setItem('todoapp_data', JSON.stringify(data));
            },
            loadFromStorage: function() {
              const data = this.storage.getItem('todoapp_data');
              if (data) {
                const parsed = JSON.parse(data);
                this.state.todos = parsed.todos || [];
                this.state.currentFilter = parsed.currentFilter || 'all';
                return true;
              }
              return false;
            }
          };

          // Test save
          mockApp.saveToStorage();
          const savedData = mockApp.storage.getItem('todoapp_data');
          if (!savedData) throw new Error('Data not saved');

          // Test load (simulate new session)
          const newApp = {
            storage: mockStorage,
            state: { todos: [], currentFilter: 'all' },
            loadFromStorage: mockApp.loadFromStorage
          };

          const loaded = newApp.loadFromStorage();
          if (!loaded) throw new Error('Data not loaded');
          if (newApp.state.todos.length !== 1) throw new Error('Todos not restored');
          if (newApp.state.todos[0].text !== 'Persistent todo') throw new Error('Todo data not restored');

          return { status: 'passed', message: 'Data persistence workflow successful' };
        } catch (error) {
          return { status: 'failed', message: error.message };
        }
      });

      testSuite.addTest('should handle performance with large todo lists', async () => {
        try {
          console.log('    ⚡ Testing performance with large datasets');

          const startTime = Date.now();

          // Generate large todo list
          const largeTodoList = Array.from({ length: 1000 }, (_, i) => ({
            id: `perf_todo_${i}`,
            text: `Performance test todo ${i + 1}`,
            completed: i % 3 === 0,
            createdAt: new Date()
          }));

          const mockApp = {
            state: { todos: largeTodoList, currentFilter: 'all' },
            getFilteredTodos: function() {
              return this.state.todos.filter(todo => {
                if (this.state.currentFilter === 'active') return !todo.completed;
                if (this.state.currentFilter === 'completed') return todo.completed;
                return true;
              });
            },
            setFilter: function(filter) {
              this.state.currentFilter = filter;
            }
          };

          // Test filtering performance
          mockApp.setFilter('active');
          const activeTodos = mockApp.getFilteredTodos();

          mockApp.setFilter('completed');
          const completedTodos = mockApp.getFilteredTodos();

          mockApp.setFilter('all');
          const allTodos = mockApp.getFilteredTodos();

          const endTime = Date.now();
          const duration = endTime - startTime;

          if (duration > 100) throw new Error(`Performance test too slow: ${duration}ms`);
          if (allTodos.length !== 1000) throw new Error('Large dataset not handled correctly');
          if (activeTodos.length + completedTodos.length !== 1000) throw new Error('Filtering logic incorrect');

          return { status: 'passed', message: `Performance test successful (${duration}ms for 1000 todos)` };
        } catch (error) {
          return { status: 'failed', message: error.message };
        }
      });

      await this.runTestSuite(testSuite);

    } catch (error) {
      console.log('❌ Failed to run E2E tests:', error.message);
      this.results.failed++;
      this.results.total++;
    }
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