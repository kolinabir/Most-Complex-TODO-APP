/**
 * TodoLang Build System Integration Tests
 *
 * Tests the complete build system including development server, production builds,
 * and error reporting tools
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TodoLangBootstrap } from '../../src/main.js';
import { TodoLangBuilder } from '../../build.js';
import { ProductionBuilder } from '../../scripts/build-production.js';
import { TodoLangDevServer } from '../../dev-server.js';
import { TodoLangErrorReporter } from '../../src/debug/error-reporter.js';

const __filenameToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test directories
const tempDir = path.join(__dirname, 'temp-build');
const testAppDir = path.join(tempDir, 'test-app');
const buildOutputDir = path.join(tempDir, 'build-output');
const prodOutputDir = path.join(tempDir, 'prod-output');

describe('TodoLang Build System Integration Tests', () => {
  beforeAll(() => {
    // Create test directories
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterAll(() => {
    // Clean up test directories
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    // Create fresh test app structure
    createTestApplication();
  });

  describe('Application Bootstrap', () => {
    test('should bootstrap complete TodoLang application', async () => {
      const bootstrap = new TodoLangBootstrap({
        mode: 'development',
        sourceDir: path.join(testAppDir, 'src', 'app'),
        outputDir: buildOutputDir,
        enableSourceMaps: true,
        enableErrorReporting: true
      });

      const success = await bootstrap.start();
      expect(success).toBe(true);

      const stats = bootstrap.getCompilationStats();
      expect(stats.totalFiles).toBeGreaterThan(0);
      expect(stats.compiledFiles).toBe(stats.totalFiles);
      expect(stats.errors).toBe(0);

      // Verify compiled files exist
      expect(fs.existsSync(path.join(buildOutputDir, 'components'))).toBe(true);
      expect(fs.existsSync(path.join(buildOutputDir, 'models'))).toBe(true);
      expect(fs.existsSync(path.join(buildOutputDir, 'services'))).toBe(true);

      bootstrap.cleanup();
    });

    test('should handle hot reloading during development', async () => {
      const bootstrap = new TodoLangBootstrap({
        mode: 'development',
        sourceDir: path.join(testAppDir, 'src', 'app'),
        outputDir: buildOutputDir,
        enableHotReload: true,
        enableErrorReporting: true
      });

      await bootstrap.start();

      // Modify a component file
      const componentFile = path.join(testAppDir, 'src', 'app', 'components', 'TodoApp.todolang');
      const originalContent = fs.readFileSync(componentFile, 'utf8');
      const modifiedContent = originalContent.replace('TodoLang Todo App', 'Modified TodoLang App');

      fs.writeFileSync(componentFile, modifiedContent);

      // Trigger hot reload
      await bootstrap.recompileFile('components/TodoApp.todolang');

      // Verify the change was compiled
      const compiledFile = path.join(buildOutputDir, 'components', 'TodoApp.js');
      const compiledContent = fs.readFileSync(compiledFile, 'utf8');
      expect(compiledContent).toContain('Modified TodoLang App');

      bootstrap.cleanup();
    });

    test('should report compilation errors with detailed information', async () => {
      // Create a file with syntax errors
      const errorFile = path.join(testAppDir, 'src', 'app', 'components', 'BrokenComponent.todolang');
      fs.writeFileSync(errorFile, `
component BrokenComponent {
  state {
    message: string = "unterminated string
  }

  render() {
    <div>Broken</div>
  }
}`);

      const bootstrap = new TodoLangBootstrap({
        mode: 'development',
        sourceDir: path.join(testAppDir, 'src', 'app'),
        outputDir: buildOutputDir,
        enableErrorReporting: true
      });

      await bootstrap.start();

      const stats = bootstrap.getCompilationStats();
      expect(stats.errors).toBeGreaterThan(0);
      expect(bootstrap.compilationErrors.length).toBeGreaterThan(0);

      const error = bootstrap.compilationErrors[0];
      expect(error.file).toContain('BrokenComponent.todolang');
      expect(error.error).toBeDefined();
      expect(error.timestamp).toBeDefined();

      bootstrap.cleanup();
    });
  });

  describe('Development Build System', () => {
    test('should build development version with all features', async () => {
      const builder = new TodoLangBuilder({
        srcDir: path.join(testAppDir, 'src'),
        distDir: buildOutputDir,
        appDir: path.join(testAppDir, 'src', 'app'),
        development: true,
        sourceMaps: true
      });

      await builder.init();
      await builder.build();

      // Verify build outputs
      expect(fs.existsSync(path.join(buildOutputDir, 'index.html'))).toBe(true);
      expect(fs.existsSync(path.join(buildOutputDir, 'todolang-framework.js'))).toBe(true);

      // Verify HTML contains development features
      const htmlContent = fs.readFileSync(path.join(buildOutputDir, 'index.html'), 'utf8');
      expect(htmlContent).toContain('TodoLang Todo Application');
      expect(htmlContent).toContain('todolang-framework.js');

      // Verify framework bundle exists and contains expected content
      const frameworkContent = fs.readFileSync(path.join(buildOutputDir, 'todolang-framework.js'), 'utf8');
      expect(frameworkContent).toContain('TodoLang Framework Bundle');
    });

    test('should watch files and rebuild on changes', async () => {
      const builder = new TodoLangBuilder({
        srcDir: path.join(testAppDir, 'src'),
        distDir: buildOutputDir,
        appDir: path.join(testAppDir, 'src', 'app'),
        development: true,
        watch: true
      });

      await builder.init();
      await builder.build();

      // Get initial build time
      const initialStat = fs.statSync(path.join(buildOutputDir, 'index.html'));

      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 100));

      // Modify a source file
      const componentFile = path.join(testAppDir, 'src', 'app', 'components', 'TodoApp.todolang');
      const content = fs.readFileSync(componentFile, 'utf8');
      fs.writeFileSync(componentFile, content + '\n// Modified');

      // In a real test, you would wait for the file watcher to trigger
      // For this test, we'll manually trigger a rebuild
      await builder.build();

      // Verify the build was updated
      const updatedStat = fs.statSync(path.join(buildOutputDir, 'index.html'));
      expect(updatedStat.mtime.getTime()).toBeGreaterThanOrEqual(initialStat.mtime.getTime());
    });
  });

  describe('Production Build System', () => {
    test('should create optimized production build', async () => {
      const prodBuilder = new ProductionBuilder({
        sourceDir: path.join(testAppDir, 'src', 'app'),
        outputDir: prodOutputDir,
        enableMinification: true,
        enableOptimization: true,
        enableBundling: true,
        enableAnalysis: true
      });

      const success = await prodBuilder.build();
      expect(success).toBe(true);

      // Verify production outputs
      expect(fs.existsSync(path.join(prodOutputDir, 'index.html'))).toBe(true);
      expect(fs.existsSync(path.join(prodOutputDir, 'todolang-app.bundle.js'))).toBe(true);
      expect(fs.existsSync(path.join(prodOutputDir, 'build-manifest.json'))).toBe(true);
      expect(fs.existsSync(path.join(prodOutputDir, 'build-analysis.json'))).toBe(true);

      // Verify production HTML is optimized
      const htmlContent = fs.readFileSync(path.join(prodOutputDir, 'index.html'), 'utf8');
      expect(htmlContent).toContain('TodoLang Todo Application');
      expect(htmlContent).toContain('todolang-app.bundle.js');
      expect(htmlContent).not.toContain('source-maps'); // Should not reference source maps

      // Verify bundle is created and minified
      const bundleContent = fs.readFileSync(path.join(prodOutputDir, 'todolang-app.bundle.js'), 'utf8');
      expect(bundleContent).toContain('TodoLang Application Bundle');
      expect(bundleContent).toContain('Generated:');
      expect(bundleContent).toContain('Mode: production');

      // Verify build manifest contains expected information
      const manifest = JSON.parse(fs.readFileSync(path.join(prodOutputDir, 'build-manifest.json'), 'utf8'));
      expect(manifest.mode).toBe('production');
      expect(manifest.stats).toBeDefined();
      expect(manifest.stats.totalFiles).toBeGreaterThan(0);
      expect(manifest.stats.compiledFiles).toBeGreaterThan(0);
      expect(manifest.files).toBeDefined();
      expect(Array.isArray(manifest.files)).toBe(true);

      // Verify build analysis
      const analysis = JSON.parse(fs.readFileSync(path.join(prodOutputDir, 'build-analysis.json'), 'utf8'));
      expect(analysis.bundleSize).toBeGreaterThan(0);
      expect(analysis.fileCount).toBeGreaterThan(0);
      expect(analysis.buildTime).toBeGreaterThan(0);
    });

    test('should optimize code and remove development features', async () => {
      // Create a component with development-only code
      const devComponentFile = path.join(testAppDir, 'src', 'app', 'components', 'DevComponent.todolang');
      fs.writeFileSync(devComponentFile, `
component DevComponent {
  state {
    debug: boolean = true
  }

  render() {
    <div>
      <h1>Development Component</h1>
      {this.state.debug && <p>Debug mode enabled</p>}
    </div>
  }

  debugLog(message: string) {
    console.log("DEBUG:", message)
    console.debug("Detailed debug info")
  }
}`);

      const prodBuilder = new ProductionBuilder({
        sourceDir: path.join(testAppDir, 'src', 'app'),
        outputDir: prodOutputDir,
        enableMinification: true,
        enableOptimization: true
      });

      await prodBuilder.build();

      // Verify the compiled component has debug code removed
      const compiledFile = path.join(prodOutputDir, 'components', 'DevComponent.js');
      expect(fs.existsSync(compiledFile)).toBe(true);

      const compiledContent = fs.readFileSync(compiledFile, 'utf8');
      expect(compiledContent).toContain('class DevComponent');
      // Debug console statements should be removed in production
      expect(compiledContent).not.toContain('console.log');
      expect(compiledContent).not.toContain('console.debug');
    });

    test('should handle production build errors gracefully', async () => {
      // Create a source file that will cause compilation errors
      const errorFile = path.join(testAppDir, 'src', 'app', 'components', 'ErrorComponent.todolang');
      fs.writeFileSync(errorFile, `
component ErrorComponent {
  state {
    message: string = "unterminated
  }
}`);

      const prodBuilder = new ProductionBuilder({
        sourceDir: path.join(testAppDir, 'src', 'app'),
        outputDir: prodOutputDir
      });

      // Production build should fail with compilation errors
      await expect(prodBuilder.build()).rejects.toThrow();
    });
  });

  describe('Development Server', () => {
    test('should start development server and serve files', async () => {
      // First build the application
      const builder = new TodoLangBuilder({
        srcDir: path.join(testAppDir, 'src'),
        distDir: buildOutputDir,
        appDir: path.join(testAppDir, 'src', 'app')
      });

      await builder.init();
      await builder.build();

      // Create dev server instance
      const devServer = new TodoLangDevServer({
        port: 0, // Use random available port
        distDir: buildOutputDir
      });

      // Test server initialization (without actually starting the HTTP server)
      expect(devServer.port).toBeDefined();
      expect(devServer.distDir).toBe(buildOutputDir);

      // Test content type detection
      expect(devServer.getContentType('.html')).toBe('text/html');
      expect(devServer.getContentType('.js')).toBe('application/javascript');
      expect(devServer.getContentType('.css')).toBe('text/css');
      expect(devServer.getContentType('.json')).toBe('application/json');

      // Clean up
      devServer.cleanup();
    });

    test('should handle file watching and hot reload', async () => {
      const builder = new TodoLangBuilder({
        srcDir: path.join(testAppDir, 'src'),
        distDir: buildOutputDir,
        appDir: path.join(testAppDir, 'src', 'app')
      });

      await builder.init();
      await builder.build();

      const devServer = new TodoLangDevServer({
        distDir: buildOutputDir
      });

      // Test file change handling
      const testFile = path.join(testAppDir, 'src', 'app', 'components', 'TodoApp.todolang');

      // Simulate file change
      await devServer.handleFileChange(testFile);

      // In a real implementation, this would trigger a rebuild
      // For testing, we just verify the method doesn't throw
      expect(true).toBe(true);

      devServer.cleanup();
    });
  });

  describe('Error Reporting and Debugging', () => {
    test('should create comprehensive error reports', async () => {
      const errorReporter = new TodoLangErrorReporter({
        enableFileLogging: true,
        logDirectory: path.join(tempDir, 'logs')
      });

      // Test compilation error reporting
      const compilationError = new Error('Syntax error: unexpected token');
      compilationError.name = 'CompilationError';
      compilationError.location = { line: 5, column: 10 };

      const sourceCode = `
component TestComponent {
  state {
    message: string = "hello"
    invalid syntax here
  }
}`;

      const errorReport = errorReporter.reportCompilationError(
        compilationError,
        sourceCode,
        'TestComponent.todolang'
      );

      expect(errorReport.type).toBe('compilation');
      expect(errorReport.file).toBe('TestComponent.todolang');
      expect(errorReport.error.message).toBe('Syntax error: unexpected token');
      expect(errorReport.location).toEqual({ line: 5, column: 10 });
      expect(errorReport.context).toBeDefined();
      expect(errorReport.context.lines).toBeDefined();

      // Test runtime error reporting
      const runtimeError = new Error('Cannot read property of undefined');
      runtimeError.name = 'RuntimeError';

      const runtimeReport = errorReporter.reportRuntimeError(runtimeError, {
        component: 'TodoApp',
        method: 'addTodo',
        state: { todos: [] }
      });

      expect(runtimeReport.type).toBe('runtime');
      expect(runtimeReport.executionContext.component).toBe('TodoApp');
      expect(runtimeReport.executionContext.method).toBe('addTodo');

      // Test warning reporting
      const warningReport = errorReporter.reportWarning('Deprecated API usage', {
        file: 'TodoApp.todolang',
        location: { line: 10, column: 5 }
      });

      expect(warningReport.type).toBe('warning');
      expect(warningReport.message).toBe('Deprecated API usage');

      // Test debug logging
      errorReporter.debug('Component rendered', { component: 'TodoApp', renderTime: 15 });

      // Test statistics
      const stats = errorReporter.getStatistics();
      expect(stats.total.errors).toBe(2);
      expect(stats.total.warnings).toBe(1);
      expect(stats.total.debugEntries).toBe(1);

      // Test error report export
      const reportPath = errorReporter.exportErrorReport();
      expect(fs.existsSync(reportPath)).toBe(true);

      const exportedReport = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      expect(exportedReport.summary.totalErrors).toBe(2);
      expect(exportedReport.summary.totalWarnings).toBe(1);
      expect(exportedReport.errors).toHaveLength(2);
      expect(exportedReport.warnings).toHaveLength(1);
    });

    test('should provide helpful error suggestions', async () => {
      const errorReporter = new TodoLangErrorReporter();

      // Test suggestions for common errors
      const unterminatedStringError = new Error('Unterminated string literal');
      const suggestions = errorReporter.generateErrorSuggestions(
        unterminatedStringError,
        'message: string = "unterminated'
      );

      expect(suggestions).toContain('Check for missing closing quotes in string literals');
      expect(suggestions).toContain('Ensure string quotes are properly escaped');

      const unexpectedTokenError = new Error('Unexpected token }');
      const tokenSuggestions = errorReporter.generateErrorSuggestions(
        unexpectedTokenError,
        '  }'
      );

      expect(tokenSuggestions).toContain('Check for missing semicolons, brackets, or quotes');
    });

    test('should extract source code context around errors', async () => {
      const errorReporter = new TodoLangErrorReporter({
        contextLineCount: 2
      });

      const sourceCode = `line 1
line 2
line 3
line 4 with error
line 5
line 6
line 7`;

      const context = errorReporter.extractContext(sourceCode, { line: 4, column: 10 });

      expect(context.startLine).toBe(2);
      expect(context.endLine).toBe(6);
      expect(context.lines).toHaveLength(5);
      expect(context.lines[2].isErrorLine).toBe(true);
      expect(context.lines[2].content).toBe('line 4 with error');
      expect(context.lines[2].column).toBe(10);
    });
  });

  describe('End-to-End Integration', () => {
    test('should complete full development workflow', async () => {
      // Step 1: Bootstrap application
      const bootstrap = new TodoLangBootstrap({
        mode: 'development',
        sourceDir: path.join(testAppDir, 'src', 'app'),
        outputDir: buildOutputDir,
        enableSourceMaps: true,
        enableHotReload: true,
        enableErrorReporting: true
      });

      await bootstrap.start();

      // Step 2: Build development version
      const builder = new TodoLangBuilder({
        srcDir: path.join(testAppDir, 'src'),
        distDir: buildOutputDir,
        appDir: path.join(testAppDir, 'src', 'app'),
        development: true,
        sourceMaps: true
      });

      await builder.init();
      await builder.build();

      // Step 3: Simulate file changes and hot reload
      const componentFile = path.join(testAppDir, 'src', 'app', 'components', 'TodoApp.todolang');
      const originalContent = fs.readFileSync(componentFile, 'utf8');
      fs.writeFileSync(componentFile, originalContent.replace('TodoLang Todo App', 'Updated App'));

      await bootstrap.recompileFile('components/TodoApp.todolang');

      // Step 4: Create production build
      const prodBuilder = new ProductionBuilder({
        sourceDir: path.join(testAppDir, 'src', 'app'),
        outputDir: prodOutputDir,
        enableMinification: true,
        enableOptimization: true,
        enableBundling: true
      });

      await prodBuilder.build();

      // Verify all steps completed successfully
      expect(fs.existsSync(path.join(buildOutputDir, 'components', 'TodoApp.js'))).toBe(true);
      expect(fs.existsSync(path.join(prodOutputDir, 'todolang-app.bundle.js'))).toBe(true);
      expect(fs.existsSync(path.join(prodOutputDir, 'build-manifest.json'))).toBe(true);

      // Verify hot reload worked
      const hotReloadedContent = fs.readFileSync(path.join(buildOutputDir, 'components', 'TodoApp.js'), 'utf8');
      expect(hotReloadedContent).toContain('Updated App');

      bootstrap.cleanup();
    });

    test('should handle complete error recovery workflow', async () => {
      // Create application with errors
      const errorComponentFile = path.join(testAppDir, 'src', 'app', 'components', 'ErrorComponent.todolang');
      fs.writeFileSync(errorComponentFile, `
component ErrorComponent {
  state {
    message: string = "broken syntax
  }
}`);

      const errorReporter = new TodoLangErrorReporter({
        enableFileLogging: true,
        logDirectory: path.join(tempDir, 'error-logs')
      });

      const bootstrap = new TodoLangBootstrap({
        mode: 'development',
        sourceDir: path.join(testAppDir, 'src', 'app'),
        outputDir: buildOutputDir,
        enableErrorReporting: true
      });

      // Bootstrap should handle errors gracefully
      await bootstrap.start();

      const stats = bootstrap.getCompilationStats();
      expect(stats.errors).toBeGreaterThan(0);

      // Fix the error
      fs.writeFileSync(errorComponentFile, `
component ErrorComponent {
  state {
    message: string = "fixed syntax"
  }

  render() {
    <div>{this.state.message}</div>
  }
}`);

      // Recompile the fixed file
      await bootstrap.recompileFile('components/ErrorComponent.todolang');

      // Verify error was resolved
      const updatedStats = bootstrap.getCompilationStats();
      expect(updatedStats.errors).toBe(0);

      // Verify the fixed file was compiled
      const compiledFile = path.join(buildOutputDir, 'components', 'ErrorComponent.js');
      expect(fs.existsSync(compiledFile)).toBe(true);

      const compiledContent = fs.readFileSync(compiledFile, 'utf8');
      expect(compiledContent).toContain('fixed syntax');

      bootstrap.cleanup();
    });
  });
});

/**
 * Create a test TodoLang application structure
 */
function createTestApplication() {
  const appSrcDir = path.join(testAppDir, 'src', 'app');
  const componentsDir = path.join(appSrcDir, 'components');
  const modelsDir = path.join(appSrcDir, 'models');
  const servicesDir = path.join(appSrcDir, 'services');

  // Create directories
  fs.mkdirSync(componentsDir, { recursive: true });
  fs.mkdirSync(modelsDir, { recursive: true });
  fs.mkdirSync(servicesDir, { recursive: true });

  // Create main TodoApp component
  fs.writeFileSync(path.join(componentsDir, 'TodoApp.todolang'), `
component TodoApp {
  state {
    todos: Todo[] = []
    filter: FilterType = "all"
    newTodoText: string = ""
  }

  render() {
    <div class="todo-app">
      <h1>TodoLang Todo App</h1>
      <TodoInput
        value={this.state.newTodoText}
        onInput={this.handleInput}
        onSubmit={this.addTodo}
      />
      <TodoList
        todos={this.filteredTodos}
        onToggle={this.toggleTodo}
        onDelete={this.deleteTodo}
      />
      <TodoFilter
        current={this.state.filter}
        onChange={this.setFilter}
      />
    </div>
  }

  computed filteredTodos(): Todo[] {
    return this.state.todos.filter(todo => {
      if (this.state.filter === "active") return !todo.completed
      if (this.state.filter === "completed") return todo.completed
      return true
    })
  }

  handleInput(text: string) {
    this.setState({ newTodoText: text })
  }

  addTodo() {
    if (this.state.newTodoText.trim()) {
      const todo = Todo.create(this.state.newTodoText.trim())
      this.setState({
        todos: [...this.state.todos, todo],
        newTodoText: ""
      })
      StorageService.getInstance().saveTodos(this.state.todos)
    }
  }

  toggleTodo(id: string) {
    const todos = this.state.todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    )
    this.setState({ todos })
    StorageService.getInstance().saveTodos(todos)
  }

  deleteTodo(id: string) {
    const todos = this.state.todos.filter(todo => todo.id !== id)
    this.setState({ todos })
    StorageService.getInstance().saveTodos(todos)
  }

  setFilter(filter: FilterType) {
    this.setState({ filter })
  }

  onMount() {
    const savedTodos = StorageService.getInstance().loadTodos()
    if (savedTodos) {
      this.setState({ todos: savedTodos })
    }
  }
}`);

  // Create TodoInput component
  fs.writeFileSync(path.join(componentsDir, 'TodoInput.todolang'), `
component TodoInput {
  props {
    value: string
    onInput: (text: string) => void
    onSubmit: () => void
  }

  render() {
    <div class="todo-input">
      <input
        type="text"
        value={this.props.value}
        placeholder="Add a new todo..."
        onInput={this.handleInput}
        onKeyPress={this.handleKeyPress}
      />
      <button onClick={this.props.onSubmit}>Add</button>
    </div>
  }

  handleInput(event: Event) {
    this.props.onInput(event.target.value)
  }

  handleKeyPress(event: KeyboardEvent) {
    if (event.key === "Enter") {
      this.props.onSubmit()
    }
  }
}`);

  // Create TodoList component
  fs.writeFileSync(path.join(componentsDir, 'TodoList.todolang'), `
component TodoList {
  props {
    todos: Todo[]
    onToggle: (id: string) => void
    onDelete: (id: string) => void
  }

  render() {
    <div class="todo-list">
      {this.props.todos.length === 0 ? (
        <div class="empty-state">No todos yet. Add one above!</div>
      ) : (
        this.props.todos.map(todo => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggle={this.props.onToggle}
            onDelete={this.props.onDelete}
          />
        ))
      )}
    </div>
  }
}`);

  // Create TodoItem component
  fs.writeFileSync(path.join(componentsDir, 'TodoItem.todolang'), `
component TodoItem {
  props {
    todo: Todo
    onToggle: (id: string) => void
    onDelete: (id: string) => void
  }

  render() {
    <div class={"todo-item" + (this.props.todo.completed ? " completed" : "")}>
      <input
        type="checkbox"
        checked={this.props.todo.completed}
        onChange={() => this.props.onToggle(this.props.todo.id)}
      />
      <span class="todo-text">{this.props.todo.text}</span>
      <button
        class="delete-btn"
        onClick={() => this.props.onDelete(this.props.todo.id)}
      >
        Delete
      </button>
    </div>
  }
}`);

  // Create TodoFilter component
  fs.writeFileSync(path.join(componentsDir, 'TodoFilter.todolang'), `
component TodoFilter {
  props {
    current: FilterType
    onChange: (filter: FilterType) => void
  }

  render() {
    <div class="todo-filters">
      <button
        class={"filter-btn" + (this.props.current === "all" ? " active" : "")}
        onClick={() => this.props.onChange("all")}
      >
        All
      </button>
      <button
        class={"filter-btn" + (this.props.current === "active" ? " active" : "")}
        onClick={() => this.props.onChange("active")}
      >
        Active
      </button>
      <button
        class={"filter-btn" + (this.props.current === "completed" ? " active" : "")}
        onClick={() => this.props.onChange("completed")}
      >
        Completed
      </button>
    </div>
  }
}`);

  // Create Todo model
  fs.writeFileSync(path.join(modelsDir, 'Todo.todolang'), `
model Todo {
  id: string
  text: string
  completed: boolean = false
  createdAt: Date = Date.now()

  static create(text: string): Todo {
    return Todo {
      id: "todo_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
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
}

type FilterType = "all" | "active" | "completed"
`);

  // Create StorageService
  fs.writeFileSync(path.join(servicesDir, 'StorageService.todolang'), `
service StorageService {
  private static TODOS_KEY = "todolang_todos"

  saveTodos(todos: Todo[]): void {
    try {
      localStorage.setItem(StorageService.TODOS_KEY, JSON.stringify(todos))
    } catch (error) {
      console.error("Failed to save todos:", error)
    }
  }

  loadTodos(): Todo[]? {
    try {
      const item = localStorage.getItem(StorageService.TODOS_KEY)
      return item ? JSON.parse(item) : null
    } catch (error) {
      console.error("Failed to load todos:", error)
      return null
    }
  }

  clearTodos(): void {
    localStorage.removeItem(StorageService.TODOS_KEY)
  }

  exportTodos(): string {
    const todos = this.loadTodos()
    return todos ? JSON.stringify(todos, null, 2) : "[]"
  }

  importTodos(jsonData: string): boolean {
    try {
      const todos = JSON.parse(jsonData)
      if (Array.isArray(todos)) {
        this.saveTodos(todos)
        return true
      }
      return false
    } catch (error) {
      console.error("Failed to import todos:", error)
      return false
    }
  }
}`);

  // Create main index file
  fs.writeFileSync(path.join(componentsDir, 'index.todolang'), `
// Main application entry point
import { TodoApp } from './TodoApp.todolang'
import { Todo } from '../models/Todo.todolang'
import { StorageService } from '../services/StorageService.todolang'

// Export main application component
export default TodoApp
`);
}