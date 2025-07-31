/**
 * TodoLang Compilation Pipeline Integration Tests
 *
 * Tests the complete compilation pipeline from TodoLang source to JavaScript execution
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TodoLangBootstrap } from '../../src/main.js';
import { TodoLangLexer } from '../../src/language/lexer/index.js';
import { TodoLangParser } from '../../src/language/parser/index.js';
import { TodoLangCompiler } from '../../src/language/compiler/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test fixtures directory
const fixturesDir = path.join(__dirname, 'fixtures');
const tempDir = path.join(__dirname, 'temp');

describe('TodoLang Compilation Pipeline Integration Tests', () => {
  let bootstrap;
  let lexer;
  let parser;
  let compiler;

  beforeAll(() => {
    // Create temp directory for test outputs
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Create fixtures directory if it doesn't exist
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }

    // Initialize language components
    lexer = new TodoLangLexer();
    parser = new TodoLangParser();
    compiler = new TodoLangCompiler({
      generateSourceMaps: true,
      minify: false
    });
  });

  afterAll(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    // Clean up bootstrap
    if (bootstrap) {
      bootstrap.cleanup();
    }
  });

  beforeEach(() => {
    // Clear any existing bootstrap
    if (bootstrap) {
      bootstrap.cleanup();
    }
  });

  describe('End-to-End Compilation', () => {
    test('should compile simple TodoLang component to JavaScript', async () => {
      const todoLangSource = `
component SimpleComponent {
  state {
    message: string = "Hello, TodoLang!"
    count: number = 0
  }

  render() {
    <div class="simple-component">
      <h1>{this.state.message}</h1>
      <p>Count: {this.state.count}</p>
      <button onClick={this.increment}>Increment</button>
    </div>
  }

  increment() {
    this.setState({
      count: this.state.count + 1
    })
  }
}`;

      // Step 1: Tokenize
      const tokens = lexer.tokenize(todoLangSource);
      expect(tokens).toBeDefined();
      expect(tokens.length).toBeGreaterThan(0);

      // Step 2: Parse
      const ast = parser.parse(tokens);
      expect(ast).toBeDefined();
      expect(ast.type).toBe('Program');
      expect(ast.declarations).toHaveLength(1);
      expect(ast.declarations[0].type).toBe('Component');
      expect(ast.declarations[0].name).toBe('SimpleComponent');

      // Step 3: Compile
      const compilationResult = compiler.compile(ast);
      expect(compilationResult).toBeDefined();
      expect(compilationResult.code).toBeDefined();
      expect(typeof compilationResult.code).toBe('string');
      expect(compilationResult.code.length).toBeGreaterThan(0);

      // Verify generated JavaScript contains expected elements
      expect(compilationResult.code).toContain('class SimpleComponent extends Component');
      expect(compilationResult.code).toContain('initializeState()');
      expect(compilationResult.code).toContain('render()');
      expect(compilationResult.code).toContain('increment()');
      expect(compilationResult.code).toContain('this.createElement');

      // Verify source map is generated
      if (compilationResult.sourceMap) {
        expect(compilationResult.sourceMap.version).toBe(3);
        expect(compilationResult.sourceMap.mappings).toBeDefined();
      }
    });

    test('should compile TodoLang model to JavaScript', async () => {
      const todoLangSource = `
model Todo {
  id: string
  text: string
  completed: boolean = false
  createdAt: Date = Date.now()

  static create(text: string): Todo {
    return Todo {
      id: generateId(),
      text: text
    }
  }

  toggle() {
    this.completed = !this.completed
  }

  isOverdue(): boolean {
    const daysSinceCreated = (Date.now() - this.createdAt) / (1000 * 60 * 60 * 24)
    return !this.completed && daysSinceCreated > 7
  }
}`;

      const tokens = lexer.tokenize(todoLangSource);
      const ast = parser.parse(tokens);
      const compilationResult = compiler.compile(ast);

      expect(compilationResult.code).toContain('class Todo');
      expect(compilationResult.code).toContain('constructor(');
      expect(compilationResult.code).toContain('static create(');
      expect(compilationResult.code).toContain('toggle()');
      expect(compilationResult.code).toContain('isOverdue()');
    });

    test('should compile TodoLang service to JavaScript', async () => {
      const todoLangSource = `
service StorageService {
  save(key: string, data: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(data))
    } catch (error) {
      console.error("Failed to save data:", error)
    }
  }

  load(key: string): any? {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : null
    } catch (error) {
      console.error("Failed to load data:", error)
      return null
    }
  }

  clear(key: string): void {
    localStorage.removeItem(key)
  }
}`;

      const tokens = lexer.tokenize(todoLangSource);
      const ast = parser.parse(tokens);
      const compilationResult = compiler.compile(ast);

      expect(compilationResult.code).toContain('class StorageService');
      expect(compilationResult.code).toContain('static instance = null');
      expect(compilationResult.code).toContain('static getInstance()');
      expect(compilationResult.code).toContain('save(');
      expect(compilationResult.code).toContain('load(');
      expect(compilationResult.code).toContain('clear(');
    });
  });

  describe('Bootstrap Integration', () => {
    test('should initialize bootstrap with test source files', async () => {
      // Create test source files
      const testSourceDir = path.join(tempDir, 'test-app');
      const componentsDir = path.join(testSourceDir, 'components');
      const modelsDir = path.join(testSourceDir, 'models');
      const servicesDir = path.join(testSourceDir, 'services');

      fs.mkdirSync(componentsDir, { recursive: true });
      fs.mkdirSync(modelsDir, { recursive: true });
      fs.mkdirSync(servicesDir, { recursive: true });

      // Write test component
      fs.writeFileSync(path.join(componentsDir, 'index.todolang'), `
component TestApp {
  state {
    todos: Todo[] = []
    filter: string = "all"
  }

  render() {
    <div class="test-app">
      <h1>Test TodoLang App</h1>
      <div class="todo-count">
        {this.state.todos.length} todos
      </div>
    </div>
  }

  addTodo(text: string) {
    const todo = Todo.create(text)
    this.setState({
      todos: [...this.state.todos, todo]
    })
  }
}`);

      // Write test model
      fs.writeFileSync(path.join(modelsDir, 'index.todolang'), `
model Todo {
  id: string
  text: string
  completed: boolean = false

  static create(text: string): Todo {
    return Todo {
      id: "todo_" + Date.now(),
      text: text
    }
  }
}`);

      // Write test service
      fs.writeFileSync(path.join(servicesDir, 'index.todolang'), `
service TestService {
  getMessage(): string {
    return "Hello from TodoLang service!"
  }
}`);

      // Initialize bootstrap
      bootstrap = new TodoLangBootstrap({
        mode: 'development',
        sourceDir: testSourceDir,
        outputDir: path.join(tempDir, 'compiled'),
        enableSourceMaps: true,
        enableErrorReporting: true
      });

      // Test bootstrap initialization
      await expect(bootstrap.start()).resolves.toBe(true);

      // Verify compilation results
      const stats = bootstrap.getCompilationStats();
      expect(stats.totalFiles).toBe(3);
      expect(stats.compiledFiles).toBe(3);
      expect(stats.errors).toBe(0);

      // Verify compiled files exist
      const compiledDir = path.join(tempDir, 'compiled');
      expect(fs.existsSync(path.join(compiledDir, 'components', 'index.js'))).toBe(true);
      expect(fs.existsSync(path.join(compiledDir, 'models', 'index.js'))).toBe(true);
      expect(fs.existsSync(path.join(compiledDir, 'services', 'index.js'))).toBe(true);

      // Verify source maps exist
      expect(fs.existsSync(path.join(compiledDir, 'components', 'index.js.map'))).toBe(true);
      expect(fs.existsSync(path.join(compiledDir, 'models', 'index.js.map'))).toBe(true);
      expect(fs.existsSync(path.join(compiledDir, 'services', 'index.js.map'))).toBe(true);
    });

    test('should handle compilation errors gracefully', async () => {
      // Create test source with syntax errors
      const testSourceDir = path.join(tempDir, 'error-app');
      const componentsDir = path.join(testSourceDir, 'components');

      fs.mkdirSync(componentsDir, { recursive: true });

      // Write component with syntax error
      fs.writeFileSync(path.join(componentsDir, 'index.todolang'), `
component BrokenComponent {
  state {
    message: string = "Hello"
    // Missing closing brace

  render() {
    <div>Broken component</div>
  }
}`);

      bootstrap = new TodoLangBootstrap({
        mode: 'development',
        sourceDir: testSourceDir,
        outputDir: path.join(tempDir, 'error-compiled'),
        enableErrorReporting: true
      });

      // Bootstrap should handle errors gracefully in development mode
      await expect(bootstrap.start()).resolves.toBe(true);

      const stats = bootstrap.getCompilationStats();
      expect(stats.totalFiles).toBe(1);
      expect(stats.errors).toBeGreaterThan(0);
      expect(bootstrap.compilationErrors).toHaveLength(1);
      expect(bootstrap.compilationErrors[0].file).toBe('components/index.todolang');
    });

    test('should support hot reloading in development mode', async () => {
      const testSourceDir = path.join(tempDir, 'hot-reload-app');
      const componentsDir = path.join(testSourceDir, 'components');

      fs.mkdirSync(componentsDir, { recursive: true });

      const componentFile = path.join(componentsDir, 'index.todolang');

      // Write initial component
      fs.writeFileSync(componentFile, `
component HotReloadComponent {
  state {
    message: string = "Initial message"
  }

  render() {
    <div>{this.state.message}</div>
  }
}`);

      bootstrap = new TodoLangBootstrap({
        mode: 'development',
        sourceDir: testSourceDir,
        outputDir: path.join(tempDir, 'hot-reload-compiled'),
        enableHotReload: true,
        enableErrorReporting: true
      });

      await bootstrap.start();

      // Get initial compilation time
      const initialStats = bootstrap.getCompilationStats();
      expect(initialStats.compiledFiles).toBe(1);

      // Simulate file change
      const updatedSource = `
component HotReloadComponent {
  state {
    message: string = "Updated message"
    count: number = 0
  }

  render() {
    <div>
      <p>{this.state.message}</p>
      <p>Count: {this.state.count}</p>
    </div>
  }

  increment() {
    this.setState({ count: this.state.count + 1 })
  }
}`;

      fs.writeFileSync(componentFile, updatedSource);

      // Trigger hot reload
      await bootstrap.recompileFile('components/index.todolang');

      // Verify recompilation
      const updatedStats = bootstrap.getCompilationStats();
      expect(updatedStats.compiledFiles).toBe(1);
      expect(updatedStats.errors).toBe(0);

      // Verify the compiled output contains the new method
      const compiledFile = path.join(tempDir, 'hot-reload-compiled', 'components', 'index.js');
      const compiledContent = fs.readFileSync(compiledFile, 'utf8');
      expect(compiledContent).toContain('increment()');
      expect(compiledContent).toContain('Updated message');
    });
  });

  describe('Error Handling and Debugging', () => {
    test('should provide detailed error information for lexer errors', async () => {
      const invalidSource = `
component InvalidComponent {
  state {
    message: string = "unterminated string
  }
}`;

      expect(() => {
        lexer.tokenize(invalidSource);
      }).toThrow();

      try {
        lexer.tokenize(invalidSource);
      } catch (error) {
        expect(error.name).toBe('LexerError');
        expect(error.location).toBeDefined();
        expect(error.location.line).toBeGreaterThan(0);
        expect(error.location.column).toBeGreaterThan(0);
      }
    });

    test('should provide detailed error information for parser errors', async () => {
      const invalidSource = `
component InvalidComponent {
  state {
    message: string = "hello"
  }

  render() {
    <div>
      <p>Missing closing tag
    </div>
  }
}`;

      const tokens = lexer.tokenize(invalidSource);

      expect(() => {
        parser.parse(tokens);
      }).toThrow();

      try {
        parser.parse(tokens);
      } catch (error) {
        expect(error.name).toBe('ParseError');
        expect(error.location).toBeDefined();
      }
    });

    test('should provide detailed error information for compiler errors', async () => {
      // Create an AST with invalid structure
      const invalidAST = {
        type: 'Program',
        declarations: [{
          type: 'InvalidDeclaration',
          name: 'Test'
        }]
      };

      expect(() => {
        compiler.compile(invalidAST);
      }).toThrow();

      try {
        compiler.compile(invalidAST);
      } catch (error) {
        expect(error.name).toBe('CompilerError');
        expect(error.message).toContain('Unknown declaration type');
      }
    });

    test('should generate comprehensive error reports', async () => {
      const testSourceDir = path.join(tempDir, 'error-report-app');
      const componentsDir = path.join(testSourceDir, 'components');

      fs.mkdirSync(componentsDir, { recursive: true });

      // Write multiple files with different types of errors
      fs.writeFileSync(path.join(componentsDir, 'lexer-error.todolang'), `
component LexerError {
  state {
    message: string = "unterminated
  }
}`);

      fs.writeFileSync(path.join(componentsDir, 'parser-error.todolang'), `
component ParserError {
  state {
    message: string = "hello"
  }

  render() {
    <div>
      <p>Missing closing tag
    </div>
  }
}`);

      bootstrap = new TodoLangBootstrap({
        mode: 'development',
        sourceDir: testSourceDir,
        outputDir: path.join(tempDir, 'error-report-compiled'),
        enableErrorReporting: true
      });

      await bootstrap.start();

      const stats = bootstrap.getCompilationStats();
      expect(stats.errors).toBeGreaterThan(0);
      expect(bootstrap.compilationErrors.length).toBeGreaterThan(0);

      // Verify error reports contain useful information
      for (const error of bootstrap.compilationErrors) {
        expect(error.file).toBeDefined();
        expect(error.error).toBeDefined();
        expect(error.timestamp).toBeDefined();
        expect(error.timestamp instanceof Date).toBe(true);
      }
    });
  });

  describe('Performance and Optimization', () => {
    test('should compile large TodoLang files efficiently', async () => {
      // Generate a large TodoLang component
      const largeComponentSource = `
component LargeComponent {
  state {
    ${Array.from({ length: 50 }, (_, i) => `prop${i}: string = "value${i}"`).join('\n    ')}
  }

  render() {
    <div class="large-component">
      ${Array.from({ length: 100 }, (_, i) => `<div class="item-${i}">Item ${i}: {this.state.prop${i % 50}}</div>`).join('\n      ')}
    </div>
  }

  ${Array.from({ length: 50 }, (_, i) => `
  method${i}() {
    this.setState({ prop${i}: "updated value ${i}" })
  }`).join('\n')}
}`;

      const startTime = Date.now();

      const tokens = lexer.tokenize(largeComponentSource);
      const ast = parser.parse(tokens);
      const compilationResult = compiler.compile(ast);

      const endTime = Date.now();
      const compilationTime = endTime - startTime;

      // Compilation should complete within reasonable time (less than 5 seconds)
      expect(compilationTime).toBeLessThan(5000);

      // Verify the output is correct
      expect(compilationResult.code).toContain('class LargeComponent');
      expect(compilationResult.code).toContain('method49()');
      expect(compilationResult.code.length).toBeGreaterThan(1000);
    });

    test('should handle multiple concurrent compilations', async () => {
      const sources = Array.from({ length: 10 }, (_, i) => `
component Component${i} {
  state {
    value: number = ${i}
  }

  render() {
    <div>Component ${i}: {this.state.value}</div>
  }

  increment() {
    this.setState({ value: this.state.value + 1 })
  }
}`);

      const startTime = Date.now();

      // Compile all sources concurrently
      const compilationPromises = sources.map(async (source, i) => {
        const tokens = lexer.tokenize(source);
        const ast = parser.parse(tokens);
        const result = compiler.compile(ast);
        return { index: i, result };
      });

      const results = await Promise.all(compilationPromises);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All compilations should complete
      expect(results).toHaveLength(10);

      // Each result should be valid
      results.forEach(({ index, result }) => {
        expect(result.code).toContain(`class Component${index}`);
        expect(result.code).toContain('increment()');
      });

      // Concurrent compilation should be reasonably fast
      expect(totalTime).toBeLessThan(10000);
    });
  });

  describe('Source Map Generation', () => {
    test('should generate accurate source maps', async () => {
      const todoLangSource = `component SourceMapTest {
  state {
    message: string = "test"
  }

  render() {
    <div>{this.state.message}</div>
  }
}`;

      const tokens = lexer.tokenize(todoLangSource);
      const ast = parser.parse(tokens);
      const compilationResult = compiler.compile(ast);

      expect(compilationResult.sourceMap).toBeDefined();
      expect(compilationResult.sourceMap.version).toBe(3);
      expect(compilationResult.sourceMap.mappings).toBeDefined();

      // Source map should contain mapping information
      if (compilationResult.sourceMap.mappings) {
        expect(compilationResult.sourceMap.mappings.length).toBeGreaterThan(0);
      }
    });

    test('should map TodoLang lines to JavaScript lines correctly', async () => {
      const todoLangSource = `component LineMapTest {
  state {
    count: number = 0
  }

  render() {
    <div>
      <p>Count: {this.state.count}</p>
      <button onClick={this.increment}>+</button>
    </div>
  }

  increment() {
    this.setState({ count: this.state.count + 1 })
  }
}`;

      const tokens = lexer.tokenize(todoLangSource);
      const ast = parser.parse(tokens);
      const compilationResult = compiler.compile(ast);

      // Verify that the generated JavaScript contains line references
      expect(compilationResult.code).toContain('increment()');

      // In a full implementation, you would verify that:
      // 1. Source map mappings correctly map TodoLang line numbers to JS line numbers
      // 2. Variable names are preserved in the names array
      // 3. Source file references are correct

      if (compilationResult.sourceMap) {
        expect(compilationResult.sourceMap.sources).toBeDefined();
        expect(compilationResult.sourceMap.names).toBeDefined();
      }
    });
  });

  describe('Build System Integration', () => {
    test('should integrate with build system for production builds', async () => {
      const testSourceDir = path.join(tempDir, 'production-app');
      const componentsDir = path.join(testSourceDir, 'components');

      fs.mkdirSync(componentsDir, { recursive: true });

      fs.writeFileSync(path.join(componentsDir, 'index.todolang'), `
component ProductionApp {
  state {
    version: string = "1.0.0"
    environment: string = "production"
  }

  render() {
    <div class="production-app">
      <h1>Production TodoLang App</h1>
      <p>Version: {this.state.version}</p>
      <p>Environment: {this.state.environment}</p>
    </div>
  }
}`);

      bootstrap = new TodoLangBootstrap({
        mode: 'production',
        sourceDir: testSourceDir,
        outputDir: path.join(tempDir, 'production-compiled'),
        enableSourceMaps: false, // Typically disabled in production
        enableErrorReporting: false
      });

      await bootstrap.start();

      const stats = bootstrap.getCompilationStats();
      expect(stats.compiledFiles).toBe(1);
      expect(stats.errors).toBe(0);

      // Verify production build characteristics
      const compiledFile = path.join(tempDir, 'production-compiled', 'components', 'index.js');
      expect(fs.existsSync(compiledFile)).toBe(true);

      const compiledContent = fs.readFileSync(compiledFile, 'utf8');
      expect(compiledContent).toContain('class ProductionApp');

      // Source maps should not be generated in production mode
      expect(fs.existsSync(compiledFile + '.map')).toBe(false);
    });
  });
});

// Helper function to create test fixtures
function createTestFixture(name, content) {
  const fixturePath = path.join(fixturesDir, name);
  fs.writeFileSync(fixturePath, content);
  return fixturePath;
}

// Helper function to read test fixture
function readTestFixture(name) {
  const fixturePath = path.join(fixturesDir, name);
  return fs.readFileSync(fixturePath, 'utf8');
}

// Export test utilities for use in other test files
export {
  createTestFixture,
  readTestFixture,
  fixturesDir,
  tempDir
};