/**
 * Comprehensive TodoLang Parser Tests
 *
 * This file contains comprehensive tests for the TodoLang parser,
 * including edge cases, error handling, and complex syntax scenarios.
 */

import { TodoLangLexer } from '../../src/language/lexer/index.js';
import { TodoLangParser, ParseError } from '../../src/language/parser/index.js';

export function runComprehensiveParserTests() {
  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };

  console.log('📝 Running Comprehensive Parser Tests...\n');

  // Helper function to run a test
  function runTest(name, testFn) {
    results.total++;
    try {
      testFn();
      console.log(`  ✅ ${name}`);
      results.passed++;
    } catch (error) {
      console.log(`  ❌ ${name}: ${error.message}`);
      results.failed++;
    }
  }

  // Helper function to parse source code
  function parseSource(source) {
    const lexer = new TodoLangLexer();
    const parser = new TodoLangParser();
    const tokens = lexer.tokenize(source);
    return parser.parse(tokens);
  }

  // Helper function to expect parse error
  function expectParseError(source, expectedMessage = null) {
    try {
      parseSource(source);
      throw new Error('Expected ParseError but parsing succeeded');
    } catch (error) {
      if (!(error instanceof ParseError)) {
        throw new Error(`Expected ParseError but got ${error.constructor.name}: ${error.message}`);
      }
      if (expectedMessage && !error.message.includes(expectedMessage)) {
        throw new Error(`Expected error message to contain "${expectedMessage}" but got "${error.message}"`);
      }
    }
  }

  // ============================================================================
  // Component Declaration Edge Cases
  // ============================================================================

  runTest('should parse component with all features', () => {
    const source = `
      component ComplexComponent {
        state {
          count: number = 0
          items: string[] = []
          config: Config? = null
        }

        computed doubleCount() {
          return this.count * 2
        }

        computed filteredItems() {
          return this.items.filter(item => item.length > 0)
        }

        increment() {
          this.count++
        }

        addItem(item: string) {
          if (item.trim()) {
            this.items.push(item)
          }
        }

        static create(): ComplexComponent {
          return new ComplexComponent()
        }

        render() {
          <div class="complex">
            <h1>Count: {this.doubleCount}</h1>
            <ul>
              {this.filteredItems.map(item =>
                <li key={item}>{item}</li>
              )}
            </ul>
            <button onClick={this.increment}>+</button>
          </div>
        }
      }
    `;

    const ast = parseSource(source);
    const component = ast.declarations[0];

    if (component.name !== 'ComplexComponent') {
      throw new Error('Expected component name to be ComplexComponent');
    }
    if (component.stateDeclaration.properties.length !== 3) {
      throw new Error('Expected 3 state properties');
    }
    if (component.computedProperties.length !== 2) {
      throw new Error('Expected 2 computed properties');
    }
    if (component.methods.length !== 3) {
      throw new Error('Expected 3 methods');
    }
    if (!component.renderMethod) {
      throw new Error('Expected render method');
    }

    // Check static method
    const staticMethod = component.methods.find(m => m.isStatic);
    if (!staticMethod) {
      throw new Error('Expected static method');
    }
    if (staticMethod.name !== 'create') {
      throw new Error('Expected static method to be named create');
    }
  });

  runTest('should reject component without render method', () => {
    expectParseError(`
      component TestComponent {
        state {
          value: string = "test"
        }
      }
    `);
  });

  runTest('should reject component with duplicate state declarations', () => {
    expectParseError(`
      component TestComponent {
        state { prop1: string }
        state { prop2: number }
        render() { <div>Test</div> }
      }
    `);
  });

  runTest('should reject component with duplicate render methods', () => {
    expectParseError(`
      component TestComponent {
        render() { <div>First</div> }
        render() { <div>Second</div> }
      }
    `);
  });

  // ============================================================================
  // Type System Tests
  // ============================================================================

  runTest('should parse various type annotations', () => {
    const source = `
      model TypeTest {
        basicString: string
        basicNumber: number
        basicBoolean: boolean
        optionalString: string?
        arrayOfStrings: string[]
        optionalArray: number[]?
        customType: CustomClass
        optionalCustom: CustomClass?
        arrayOfCustom: CustomClass[]
      }
    `;

    const ast = parseSource(source);
    const model = ast.declarations[0];
    const properties = model.properties;

    if (properties.length !== 9) {
      throw new Error('Expected 9 properties');
    }

    // Check basic types
    if (properties[0].type.name !== 'string') {
      throw new Error('Expected string type');
    }

    // Check optional types
    if (!properties[3].type.isOptional) {
      throw new Error('Expected optional type');
    }

    // Check array types
    if (!properties[4].type.isArray) {
      throw new Error('Expected array type');
    }

    // Check optional array
    if (!properties[5].type.isOptional || !properties[5].type.isArray) {
      throw new Error('Expected optional array type');
    }
  });

  // ============================================================================
  // Expression Parsing Edge Cases
  // ============================================================================

  runTest('should parse complex expressions with correct precedence', () => {
    const source = `
      component ExpressionTest {
        testMethod() {
          result1 = a + b * c - d / e
          result2 = (a + b) * (c - d)
          result3 = !flag && (value > 0 || other < 10)
          result4 = condition ? trueValue : falseValue
          result5 = obj.prop[index].method(arg1, arg2)
          result6 = ++counter + value--
        }
        render() { <div>Test</div> }
      }
    `;

    const ast = parseSource(source);
    const method = ast.declarations[0].methods[0];

    if (method.body.length !== 6) {
      throw new Error('Expected 6 statements');
    }

    // Check that all statements are expression statements
    for (const stmt of method.body) {
      if (stmt.type !== 'ExpressionStatement') {
        throw new Error('Expected expression statement');
      }
      if (stmt.expression.type !== 'Assignment') {
        throw new Error('Expected assignment expression');
      }
    }
  });

  runTest('should parse nested function calls and member access', () => {
    const source = `
      component ChainTest {
        testMethod() {
          result = this.service.getData().filter(item => item.active).map(item => item.name)[0]
        }
        render() { <div>Test</div> }
      }
    `;

    const ast = parseSource(source);
    const method = ast.declarations[0].methods[0];
    const assignment = method.body[0].expression;

    // The right side should be a complex member/call chain
    if (assignment.right.type !== 'Member') {
      throw new Error('Expected member expression at top level');
    }
  });

  // ============================================================================
  // JSX Parsing Edge Cases
  // ============================================================================

  runTest('should parse nested JSX with mixed content', () => {
    const source = `
      component JSXTest {
        render() {
          <div class="container" id={this.containerId}>
            <h1>Title: {this.title}</h1>
            <p>
              Some text before
              <strong>bold text</strong>
              some text after
            </p>
            <ul>
              {this.items.map((item, index) =>
                <li key={index} class={item.active ? "active" : "inactive"}>
                  <span>{item.name}</span>
                  <button onClick={() => this.removeItem(index)}>Remove</button>
                </li>
              )}
            </ul>
            <input
              type="text"
              value={this.inputValue}
              onChange={this.handleInputChange}
              placeholder="Enter text..."
            />
            <br />
            <img src={this.imageUrl} alt="Description" />
          </div>
        }
      }
    `;

    const ast = parseSource(source);
    const renderMethod = ast.declarations[0].renderMethod;
    const jsxElement = renderMethod.body[0].expression;

    if (jsxElement.type !== 'JSXElement') {
      throw new Error('Expected JSX element');
    }
    if (jsxElement.tagName !== 'div') {
      throw new Error('Expected div tag');
    }
    if (jsxElement.children.length === 0) {
      throw new Error('Expected JSX children');
    }
  });

  runTest('should parse self-closing JSX elements', () => {
    const source = `
      component SelfClosingTest {
        render() {
          <div>
            <input type="text" value={this.value} />
            <br />
            <img src="image.jpg" alt="Image" />
            <CustomComponent prop1="value1" prop2={this.value} />
          </div>
        }
      }
    `;

    const ast = parseSource(source);
    const renderMethod = ast.declarations[0].renderMethod;
    const divElement = renderMethod.body[0].expression;

    // Check that we have self-closing elements
    let selfClosingCount = 0;
    for (const child of divElement.children) {
      if (child.type === 'JSXElement' && child.selfClosing) {
        selfClosingCount++;
      }
    }

    if (selfClosingCount === 0) {
      throw new Error('Expected self-closing JSX elements');
    }
  });

  runTest('should reject mismatched JSX tags', () => {
    expectParseError(`
      component MismatchTest {
        render() {
          <div>
            <span>Content</div>
          </div>
        }
      }
    `, 'Mismatched JSX tags');
  });

  runTest('should reject unclosed JSX elements', () => {
    expectParseError(`
      component UnclosedTest {
        render() {
          <div>
            <p>Unclosed paragraph
          </div>
        }
      }
    `);
  });

  // ============================================================================
  // Statement Parsing Edge Cases
  // ============================================================================

  runTest('should parse nested control flow statements', () => {
    const source = `
      component ControlFlowTest {
        complexMethod() {
          if (condition1) {
            for (let i = 0; i < 10; i++) {
              if (condition2) {
                while (condition3) {
                  if (condition4) {
                    return result
                  } else {
                    continue
                  }
                }
              }
            }
          } else {
            return defaultValue
          }
        }
        render() { <div>Test</div> }
      }
    `;

    const ast = parseSource(source);
    const method = ast.declarations[0].methods[0];

    if (method.body.length !== 1) {
      throw new Error('Expected 1 top-level statement');
    }
    if (method.body[0].type !== 'If') {
      throw new Error('Expected if statement');
    }
  });

  runTest('should parse for loops with various forms', () => {
    const source = `
      component ForLoopTest {
        testMethod() {
          for (let i = 0; i < 10; i++) {
            console.log(i)
          }

          for (;;) {
            break
          }

          for (item in items) {
            process(item)
          }
        }
        render() { <div>Test</div> }
      }
    `;

    const ast = parseSource(source);
    const method = ast.declarations[0].methods[0];

    if (method.body.length !== 3) {
      throw new Error('Expected 3 for loops');
    }

    for (const stmt of method.body) {
      if (stmt.type !== 'For') {
        throw new Error('Expected for statement');
      }
    }
  });

  // ============================================================================
  // Error Recovery Tests
  // ============================================================================

  runTest('should provide meaningful error messages', () => {
    try {
      parseSource(`
        component TestComponent {
          state {
            prop: invalid_syntax_here
          }
          render() { <div>Test</div> }
        }
      `);
      throw new Error('Expected parse error');
    } catch (error) {
      if (!(error instanceof ParseError)) {
        throw new Error('Expected ParseError');
      }
      if (!error.location) {
        throw new Error('Expected error location information');
      }
      if (error.location.line <= 0) {
        throw new Error('Expected valid line number');
      }
      if (error.location.column <= 0) {
        throw new Error('Expected valid column number');
      }
    }
  });

  runTest('should handle multiple syntax errors', () => {
    expectParseError(`
      component First {
        invalid syntax here
        render() { <div>First</div> }
      }

      component Second {
        more invalid syntax
        render() { <div>Second</div> }
      }
    `);
  });

  // ============================================================================
  // Complex Integration Tests
  // ============================================================================

  runTest('should parse complete TodoApp example', () => {
    const source = `
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

        validate(): boolean {
          return this.text.length > 0
        }
      }

      service StorageService {
        save(key: string, data: any): void {
          localStorage.setItem(key, JSON.stringify(data))
        }

        load(key: string): any? {
          const item = localStorage.getItem(key)
          return item ? JSON.parse(item) : null
        }

        clear(key: string): void {
          localStorage.removeItem(key)
        }
      }

      component TodoApp {
        state {
          todos: Todo[] = []
          filter: string = "all"
          editingId: string? = null
          inputValue: string = ""
        }

        computed filteredTodos() {
          return this.todos.filter(todo => {
            if (this.filter == "active") return !todo.completed
            if (this.filter == "completed") return todo.completed
            return true
          })
        }

        computed activeTodoCount() {
          return this.todos.filter(todo => !todo.completed).length
        }

        addTodo(text: string) {
          if (text.trim()) {
            this.todos.push(Todo.create(text))
            this.inputValue = ""
            this.saveToStorage()
          }
        }

        toggleTodo(id: string) {
          const todo = this.todos.find(t => t.id == id)
          if (todo) {
            todo.completed = !todo.completed
            this.saveToStorage()
          }
        }

        editTodo(id: string, newText: string) {
          const todo = this.todos.find(t => t.id == id)
          if (todo && newText.trim()) {
            todo.text = newText
            this.editingId = null
            this.saveToStorage()
          }
        }

        deleteTodo(id: string) {
          this.todos = this.todos.filter(t => t.id != id)
          this.saveToStorage()
        }

        setFilter(filter: string) {
          this.filter = filter
        }

        saveToStorage() {
          StorageService.save("todos", this.todos)
        }

        loadFromStorage() {
          const saved = StorageService.load("todos")
          if (saved) {
            this.todos = saved
          }
        }

        render() {
          <div class="todo-app">
            <header class="header">
              <h1>TodoLang</h1>
              <input
                class="new-todo"
                placeholder="What needs to be done?"
                value={this.inputValue}
                onChange={e => this.inputValue = e.target.value}
                onKeyPress={e => e.key === 'Enter' && this.addTodo(this.inputValue)}
              />
            </header>

            <section class="main">
              <ul class="todo-list">
                {this.filteredTodos.map(todo =>
                  <li key={todo.id} class={todo.completed ? "completed" : ""}>
                    <div class="view">
                      <input
                        class="toggle"
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() => this.toggleTodo(todo.id)}
                      />
                      <label onDoubleClick={() => this.editingId = todo.id}>
                        {todo.text}
                      </label>
                      <button
                        class="destroy"
                        onClick={() => this.deleteTodo(todo.id)}
                      />
                    </div>
                    {this.editingId == todo.id &&
                      <input
                        class="edit"
                        value={todo.text}
                        onBlur={e => this.editTodo(todo.id, e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && this.editTodo(todo.id, e.target.value)}
                      />
                    }
                  </li>
                )}
              </ul>
            </section>

            <footer class="footer">
              <span class="todo-count">
                <strong>{this.activeTodoCount}</strong>
                {this.activeTodoCount === 1 ? " item" : " items"} left
              </span>

              <ul class="filters">
                <li>
                  <a
                    class={this.filter === "all" ? "selected" : ""}
                    onClick={() => this.setFilter("all")}
                  >
                    All
                  </a>
                </li>
                <li>
                  <a
                    class={this.filter === "active" ? "selected" : ""}
                    onClick={() => this.setFilter("active")}
                  >
                    Active
                  </a>
                </li>
                <li>
                  <a
                    class={this.filter === "completed" ? "selected" : ""}
                    onClick={() => this.setFilter("completed")}
                  >
                    Completed
                  </a>
                </li>
              </ul>
            </footer>
          </div>
        }
      }
    `;

    const ast = parseSource(source);

    if (ast.declarations.length !== 3) {
      throw new Error('Expected 3 declarations (model, service, component)');
    }

    const [model, service, component] = ast.declarations;

    // Validate model
    if (model.type !== 'Model' || model.name !== 'Todo') {
      throw new Error('Expected Todo model');
    }
    if (model.properties.length !== 4) {
      throw new Error('Expected 4 model properties');
    }
    if (model.methods.length !== 2) {
      throw new Error('Expected 2 model methods');
    }

    // Validate service
    if (service.type !== 'Service' || service.name !== 'StorageService') {
      throw new Error('Expected StorageService');
    }
    if (service.methods.length !== 3) {
      throw new Error('Expected 3 service methods');
    }

    // Validate component
    if (component.type !== 'Component' || component.name !== 'TodoApp') {
      throw new Error('Expected TodoApp component');
    }
    if (component.stateDeclaration.properties.length !== 4) {
      throw new Error('Expected 4 state properties');
    }
    if (component.computedProperties.length !== 2) {
      throw new Error('Expected 2 computed properties');
    }
    if (component.methods.length !== 7) {
      throw new Error('Expected 7 methods');
    }
    if (!component.renderMethod) {
      throw new Error('Expected render method');
    }
  });

  // Print results
  console.log(`\n📊 Comprehensive Parser Test Results: ${results.passed}/${results.total} passed, ${results.failed} failed\n`);

  return results;
}

// Export for use in test runner
export default runComprehensiveParserTests;