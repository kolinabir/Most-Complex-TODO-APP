/**
 * TodoLang Compiler Tests
 *
 * Tests for the TodoLang compiler that transpiles AST to JavaScript
 */

import { TodoLangLexer } from '../../src/language/lexer/index.js';
import { TodoLangParser } from '../../src/language/parser/index.js';
import { TodoLangCompiler, CompilerError } from '../../src/language/compiler/index.js';

// Test helper function
function compileSource(source) {
  const lexer = new TodoLangLexer();
  const parser = new TodoLangParser();
  const compiler = new TodoLangCompiler();

  const tokens = lexer.tokenize(source);
  const ast = parser.parse(tokens);
  return compiler.compile(ast);
}

export function runCompilerTests() {
  console.log('🔧 Running Compiler Tests...');

  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };

  function test(name, fn) {
    results.total++;
    try {
      fn();
      console.log(`  ✅ ${name}`);
      results.passed++;
    } catch (error) {
      console.log(`  ❌ ${name}: ${error.message}`);
      results.failed++;
    }
  }

  // Test 1: Basic component compilation
  test('should compile basic component', () => {
    const source = `
      component TestComponent {
        render() {
          <div>Hello World</div>
        }
      }
    `;

    const result = compileSource(source);

    if (!result.code) {
      throw new Error('No code generated');
    }

    if (!result.code.includes('export class TestComponent extends Component')) {
      throw new Error('Component class not generated correctly');
    }

    if (!result.code.includes('render()')) {
      throw new Error('Render method not generated');
    }

    if (!result.code.includes('this.createElement')) {
      throw new Error('JSX not compiled to createElement calls');
    }
  });

  // Test 2: Component with state
  test('should compile component with state', () => {
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

    const result = compileSource(source);

    if (!result.code.includes('initializeState()')) {
      throw new Error('State initialization method not generated');
    }

    if (!result.code.includes('this.createReactiveState')) {
      throw new Error('Reactive state creation not generated');
    }

    if (!result.code.includes('todos: []')) {
      throw new Error('State property default values not generated');
    }
  });

  // Test 3: Component with methods
  test('should compile component methods', () => {
    const source = `
      component TodoApp {
        render() {
          <div>App</div>
        }

        addTodo(text: string) {
          this.todos.push(text)
        }

        static create() {
          return new TodoApp()
        }
      }
    `;

    const result = compileSource(source);

    if (!result.code.includes('addTodo(text)')) {
      throw new Error('Instance method not generated correctly');
    }

    if (!result.code.includes('static create()')) {
      throw new Error('Static method not generated correctly');
    }

    if (!result.code.includes('this.todos.push(text)')) {
      throw new Error('Method body not compiled correctly');
    }
  });

  // Test 4: Component with computed properties
  test('should compile computed properties', () => {
    const source = `
      component TodoApp {
        state {
          todos: Todo[] = []
          filter: string = "all"
        }

        computed filteredTodos() {
          return this.todos.filter(todo => todo.completed)
        }

        render() {
          <div>App</div>
        }
      }
    `;

    const result = compileSource(source);

    if (!result.code.includes('get filteredTodos()')) {
      throw new Error('Computed property not generated as getter');
    }

    if (!result.code.includes('this.todos.filter')) {
      throw new Error('Computed property body not compiled correctly');
    }
  });

  // Test 5: JSX compilation
  test('should compile JSX elements correctly', () => {
    const source = `
      component TestComponent {
        render() {
          <div class="container" id="main">
            <h1>Title</h1>
            <p>Content with {this.dynamicValue}</p>
            <input type="text" disabled />
          </div>
        }
      }
    `;

    const result = compileSource(source);

    if (!result.code.includes('this.createElement("div"')) {
      throw new Error('JSX element not compiled to createElement');
    }

    if (!result.code.includes('class: "container"')) {
      throw new Error('JSX attributes not compiled correctly');
    }

    if (!result.code.includes('disabled: true')) {
      throw new Error('Boolean JSX attributes not compiled correctly');
    }

    if (!result.code.includes('this.dynamicValue')) {
      throw new Error('JSX expressions not compiled correctly');
    }
  });

  // Test 6: Model compilation
  test('should compile model declarations', () => {
    const source = `
      model Todo {
        id: string
        text: string
        completed: boolean = false

        static create(text: string) {
          return new Todo(generateId(), text)
        }
      }
    `;

    const result = compileSource(source);

    if (!result.code.includes('export class Todo')) {
      throw new Error('Model class not generated');
    }

    if (!result.code.includes('constructor(id, text)')) {
      throw new Error('Model constructor not generated correctly');
    }

    if (!result.code.includes('this.completed = completed !== undefined ? completed : false')) {
      throw new Error('Model property defaults not handled correctly');
    }

    if (!result.code.includes('static create(text)')) {
      throw new Error('Model static methods not compiled correctly');
    }
  });

  // Test 7: Service compilation
  test('should compile service declarations', () => {
    const source = `
      service StorageService {
        save(key: string, data: any) {
          localStorage.setItem(key, JSON.stringify(data))
        }

        load(key: string) {
          return localStorage.getItem(key)
        }
      }
    `;

    const result = compileSource(source);

    if (!result.code.includes('export class StorageService')) {
      throw new Error('Service class not generated');
    }

    if (!result.code.includes('static getInstance()')) {
      throw new Error('Service singleton pattern not generated');
    }

    if (!result.code.includes('save(key, data)')) {
      throw new Error('Service methods not compiled correctly');
    }

    if (!result.code.includes('localStorage.setItem')) {
      throw new Error('Service method bodies not compiled correctly');
    }
  });

  // Test 8: Expression compilation
  test('should compile various expressions', () => {
    const source = `
      component TestComponent {
        testMethod() {
          const result = this.value + 10
          const condition = result > 5 ? "high" : "low"
          const array = [1, 2, 3]
          const object = { key: "value", count: result }
          return condition
        }

        render() {
          <div>Test</div>
        }
      }
    `;

    const result = compileSource(source);

    if (!result.code.includes('this.value + 10')) {
      throw new Error('Binary expressions not compiled correctly');
    }

    if (!result.code.includes('result > 5 ? "high" : "low"')) {
      throw new Error('Conditional expressions not compiled correctly');
    }

    if (!result.code.includes('[1, 2, 3]')) {
      throw new Error('Array literals not compiled correctly');
    }

    if (!result.code.includes('{ key: "value", count: result }')) {
      throw new Error('Object literals not compiled correctly');
    }
  });

  // Test 9: Control flow compilation
  test('should compile control flow statements', () => {
    const source = `
      component TestComponent {
        processItems() {
          if (this.items.length > 0) {
            for (const item of this.items) {
              if (item.active) {
                continue
              }
              this.processItem(item)
            }
          } else {
            return null
          }
        }

        render() {
          <div>Test</div>
        }
      }
    `;

    const result = compileSource(source);

    if (!result.code.includes('if (this.items.length > 0)')) {
      throw new Error('If statements not compiled correctly');
    }

    if (!result.code.includes('for (const item of this.items)')) {
      throw new Error('For-of loops not compiled correctly');
    }

    if (!result.code.includes('continue;')) {
      throw new Error('Continue statements not compiled correctly');
    }

    if (!result.code.includes('return null;')) {
      throw new Error('Return statements not compiled correctly');
    }
  });

  // Test 10: Source map generation
  test('should generate source maps when enabled', () => {
    const source = `
      component TestComponent {
        render() {
          <div>Hello</div>
        }
      }
    `;

    const compiler = new TodoLangCompiler({ generateSourceMaps: true });
    const lexer = new TodoLangLexer();
    const parser = new TodoLangParser();

    const tokens = lexer.tokenize(source);
    const ast = parser.parse(tokens);
    const result = compiler.compile(ast);

    if (!result.sourceMap) {
      throw new Error('Source map not generated');
    }

    if (!result.sourceMap.mappings) {
      throw new Error('Source map mappings not generated');
    }
  });

  // Test 11: Error handling
  test('should handle compilation errors gracefully', () => {
    try {
      const compiler = new TodoLangCompiler();
      compiler.compile(null);
      throw new Error('Should have thrown CompilerError');
    } catch (error) {
      if (!(error instanceof CompilerError)) {
        throw new Error('Should throw CompilerError for invalid input');
      }
    }
  });

  // Test 12: Complex component compilation
  test('should compile complex component with all features', () => {
    const source = `
      component TodoApp {
        state {
          todos: Todo[] = []
          filter: string = "all"
          editingId: string? = null
        }

        computed filteredTodos() {
          return this.todos.filter(todo => {
            if (this.filter == "active") return !todo.completed
            if (this.filter == "completed") return todo.completed
            return true
          })
        }

        addTodo(text: string) {
          if (text.trim()) {
            this.todos.push(Todo.create(text))
          }
        }

        render() {
          <div class="todo-app">
            <h1>Todo App</h1>
            <input
              type="text"
              placeholder="Add todo..."
              onKeyPress={this.handleKeyPress}
            />
            <ul>
              {this.filteredTodos.map(todo =>
                <li key={todo.id} class={todo.completed ? "completed" : ""}>
                  {todo.text}
                </li>
              )}
            </ul>
          </div>
        }
      }
    `;

    const result = compileSource(source);

    // Verify all major components are present
    if (!result.code.includes('export class TodoApp extends Component')) {
      throw new Error('Component class not generated');
    }

    if (!result.code.includes('initializeState()')) {
      throw new Error('State initialization not generated');
    }

    if (!result.code.includes('get filteredTodos()')) {
      throw new Error('Computed properties not generated');
    }

    if (!result.code.includes('addTodo(text)')) {
      throw new Error('Methods not generated');
    }

    if (!result.code.includes('this.createElement("div"')) {
      throw new Error('JSX not compiled');
    }

    if (!result.code.includes('onKeyPress: this.handleKeyPress')) {
      throw new Error('Event handlers not compiled correctly');
    }
  });

  console.log(`\n--- Compiler Test Results ---`);
  console.log(`Total: ${results.total}, Passed: ${results.passed}, Failed: ${results.failed}`);

  return results;
}

// Export for use in test runner
export { runCompilerTests as default };