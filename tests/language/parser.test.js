/**
 * TodoLang Parser Tests
 *
 * Comprehensive test suite for the TodoLang parser that validates
 * AST generation from tokens for all language constructs.
 */

import { TodoLangLexer } from '../../src/language/lexer/index.js';
import {
  TodoLangParser,
  ParseError,
  ProgramNode,
  ComponentNode,
  StateNode,
  PropertyNode,
  MethodNode,
  ComputedNode,
  RenderNode,
  ModelNode,
  ServiceNode,
  ParameterNode,
  TypeNode,
  BlockNode,
  ExpressionStatementNode,
  IfNode,
  ForNode,
  WhileNode,
  ReturnNode,
  BinaryExpressionNode,
  UnaryExpressionNode,
  AssignmentNode,
  ConditionalNode,
  CallNode,
  MemberNode,
  IdentifierNode,
  ThisNode,
  StringLiteralNode,
  NumberLiteralNode,
  BooleanLiteralNode,
  NullLiteralNode,
  ArrayLiteralNode,
  ObjectLiteralNode,
  ObjectPropertyNode,
  JSXElementNode,
  JSXAttributeNode,
  JSXTextNode,
  JSXExpressionNode
} from '../../src/language/parser/index.js';

describe('TodoLang Parser', () => {
  let lexer;
  let parser;

  beforeEach(() => {
    lexer = new TodoLangLexer();
    parser = new TodoLangParser();
  });

  // Helper function to parse source code
  function parseSource(source) {
    const tokens = lexer.tokenize(source);
    return parser.parse(tokens);
  }

  // ============================================================================
  // Basic Parser Functionality Tests
  // ============================================================================

  describe('Basic Parser Functionality', () => {
    test('should ce parser instance', () => {
      expect(parser).toBeInstanceOf(TodoLangParser);
      expect(parser.tokens).toEqual([]);
      expect(parser.current).toBe(0);
      expect(parser.errors).toEqual([]);
    });

    test('should parse empty program', () => {
      const ast = parseSource('');
      expect(ast).toBeInstanceOf(ProgramNode);
      expect(ast.declarations).toEqual([]);
    });

    test('should skip comments', () => {
      const source = `
        // This is a comment
        /* This is a multi-line comment */
        component TestComponent {
          render() {
            <div>Hello</div>
          }
        }
      `;
      const ast = parseSource(source);
      expect(ast.declarations).toHaveLength(1);
      expect(ast.declarations[0]).toBeInstanceOf(ComponentNode);
    });

    test('should report syntax errors with location information', () => {
      expect(() => {
        parseSource('component {');
      }).toThrow(ParseError);
    });
  });

  // ============================================================================
  // Component Declaration Tests
  // ============================================================================

  describe('Component Declaration Parsing', () => {
    test('should parse minimal component', () => {
      const source = `
        component TestComponent {
          render() {
            <div>Hello</div>
          }
        }
      `;
      const ast = parseSource(source);

      expect(ast.declarations).toHaveLength(1);
      const component = ast.declarations[0];
      expect(component).toBeInstanceOf(ComponentNode);
      expect(component.name).toBe('TestComponent');
      expect(component.stateDeclaration).toBeNull();
      expect(component.methods).toEqual([]);
      expect(component.computedProperties).toEqual([]);
      expect(component.renderMethod).toBeInstanceOf(RenderNode);
    });

    test('should parse component with state', () => {
      const source = `
        component TodoApp {
          state {
            todos: Todo[] = []
            filter: string = "all"
            editingId: string? = null
          }

          render() {
            <div>App</div>
          }
        }
      `;
      const ast = parseSource(source);

      const component = ast.declarations[0];
      expect(component.stateDeclaration).toBeInstanceOf(StateNode);
      expect(component.stateDeclaration.properties).toHaveLength(3);

      const todosProperty = component.stateDeclaration.properties[0];
      expect(todosProperty.name).toBe('todos');
      expect(todosProperty.type.name).toBe('Todo');
      expect(todosProperty.type.isArray).toBe(true);
      expect(todosProperty.defaultValue).toBeInstanceOf(ArrayLiteralNode);

      const filterProperty = component.stateDeclaration.properties[1];
      expect(filterProperty.name).toBe('filter');
      expect(filterProperty.type.name).toBe('string');
      expect(filterProperty.defaultValue).toBeInstanceOf(StringLiteralNode);

      const editingIdProperty = component.stateDeclaration.properties[2];
      expect(editingIdProperty.name).toBe('editingId');
      expect(editingIdProperty.type.isOptional).toBe(true);
      expect(editingIdProperty.defaultValue).toBeInstanceOf(NullLiteralNode);
    });

    test('should parse component with methods', () => {
      const source = `
        component TodoApp {
          addTodo(text: string) {
            this.todos.push(Todo.create(text))
          }

          toggleTodo(id: string) {
            const todo = this.todos.find(t => t.id == id)
            if (todo) {
              todo.completed = !todo.completed
            }
          }

          render() {
            <div>App</div>
          }
        }
      `;
      const ast = parseSource(source);

      const component = ast.declarations[0];
      expect(component.methods).toHaveLength(2);

      const addTodoMethod = component.methods[0];
      expect(addTodoMethod.name).toBe('addTodo');
      expect(addTodoMethod.parameters).toHaveLength(1);
      expect(addTodoMethod.parameters[0].name).toBe('text');
      expect(addTodoMethod.parameters[0].type.name).toBe('string');
      expect(addTodoMethod.body).toHaveLength(1);

      const toggleTodoMethod = component.methods[1];
      expect(toggleTodoMethod.name).toBe('toggleTodo');
      expect(toggleTodoMethod.parameters).toHaveLength(1);
      expect(toggleTodoMethod.body).toHaveLength(2);
    });

    test('should parse component with computed properties', () => {
      const source = `
        component TodoApp {
          computed filteredTodos() {
            return this.todos.filter(todo => {
              if (this.filter == "active") return !todo.completed
              if (this.filter == "completed") return todo.completed
              return true
            })
          }

          render() {
            <div>App</div>
          }
        }
      `;
      const ast = parseSource(source);

      const component = ast.declarations[0];
      expect(component.computedProperties).toHaveLength(1);

      const computed = component.computedProperties[0];
      expect(computed.name).toBe('filteredTodos');
      expect(computed.body).toHaveLength(1);
      expect(computed.body[0]).toBeInstanceOf(ReturnNode);
    });

    test('should reject component with multiple state declarations', () => {
      const source = `
        component TestComponent {
          state { prop1: string }
          state { prop2: number }
          render() { <div>Test</div> }
        }
      `;
      expect(() => parseSource(source)).toThrow(ParseError);
    });

    test('should reject component with multiple render methods', () => {
      const source = `
        component TestComponent {
          render() { <div>First</div> }
          render() { <div>Second</div> }
        }
      `;
      expect(() => parseSource(source)).toThrow(ParseError);
    });
  });

  // ============================================================================
  // Model Declaration Tests
  // ============================================================================

  describe('Model Declaration Parsing', () => {
    test('should parse model with properties', () => {
      const source = `
        model Todo {
          id: string
          text: string
          completed: boolean = false
          createdAt: Date = Date.now()
        }
      `;
      const ast = parseSource(source);

      expect(ast.declarations).toHaveLength(1);
      const model = ast.declarations[0];
      expect(model).toBeInstanceOf(ModelNode);
      expect(model.name).toBe('Todo');
      expect(model.properties).toHaveLength(4);

      const idProperty = model.properties[0];
      expect(idProperty.name).toBe('id');
      expect(idProperty.type.name).toBe('string');
      expect(idProperty.defaultValue).toBeNull();

      const completedProperty = model.properties[2];
      expect(completedProperty.name).toBe('completed');
      expect(completedProperty.defaultValue).toBeInstanceOf(BooleanLiteralNode);
      expect(completedProperty.defaultValue.value).toBe(false);
    });

    test('should parse model with methods', () => {
      const source = `
        model Todo {
          id: string
          text: string

          validate() {
            return this.text.length > 0
          }

          static create(text: string): Todo {
            return Todo {
              id: generateId(),
              text: text
            }
          }
        }
      `;
      const ast = parseSource(source);

      const model = ast.declarations[0];
      expect(model.methods).toHaveLength(2);

      const validateMethod = model.methods[0];
      expect(validateMethod.name).toBe('validate');
      expect(validateMethod.isStatic).toBe(false);

      const createMethod = model.methods[1];
      expect(createMethod.name).toBe('create');
      expect(createMethod.isStatic).toBe(true);
      expect(createMethod.parameters).toHaveLength(1);
    });
  });

  // ============================================================================
  // Service Declaration Tests
  // ============================================================================

  describe('Service Declaration Parsing', () => {
    test('should parse service with methods', () => {
      const source = `
        service StorageService {
          save(key: string, data: any): void {
            localStorage.setItem(key, JSON.stringify(data))
          }

          load(key: string): any? {
            const item = localStorage.getItem(key)
            return item ? JSON.parse(item) : null
          }
        }
      `;
      const ast = parseSource(source);

      expect(ast.declarations).toHaveLength(1);
      const service = ast.declarations[0];
      expect(service).toBeInstanceOf(ServiceNode);
      expect(service.name).toBe('StorageService');
      expect(service.methods).toHaveLength(2);

      const saveMethod = service.methods[0];
      expect(saveMethod.name).toBe('save');
      expect(saveMethod.parameters).toHaveLength(2);

      const loadMethod = service.methods[1];
      expect(loadMethod.name).toBe('load');
      expect(loadMethod.parameters).toHaveLength(1);
    });
  });

  // ============================================================================
  // Statement Parsing Tests
  // ============================================================================

  describe('Statement Parsing', () => {
    test('should parse if statements', () => {
      const source = `
        component TestComponent {
          testMethod() {
            if (condition) {
              doSomething()
            } else {
              doSomethingElse()
            }
          }
          render() { <div>Test</div> }
        }
      `;
      const ast = parseSource(source);

      const method = ast.declarations[0].methods[0];
      const ifStatement = method.body[0];
      expect(ifStatement).toBeInstanceOf(IfNode);
      expect(ifStatement.condition).toBeInstanceOf(IdentifierNode);
      expect(ifStatement.thenStatement).toBeInstanceOf(BlockNode);
      expect(ifStatement.elseStatement).toBeInstanceOf(BlockNode);
    });

    test('should parse for statements', () => {
      const source = `
        component TestComponent {
          testMethod() {
            for (let i = 0; i < 10; i++) {
              console.log(i)
            }
          }
          render() { <div>Test</div> }
        }
      `;
      const ast = parseSource(source);

      const method = ast.declarations[0].methods[0];
      const forStatement = method.body[0];
      expect(forStatement).toBeInstanceOf(ForNode);
      expect(forStatement.init).toBeDefined();
      expect(forStatement.condition).toBeDefined();
      expect(forStatement.update).toBeDefined();
      expect(forStatement.body).toBeInstanceOf(BlockNode);
    });

    test('should parse while statements', () => {
      const source = `
        component TestComponent {
          testMethod() {
            while (condition) {
              doSomething()
            }
          }
          render() { <div>Test</div> }
        }
      `;
      const ast = parseSource(source);

      const method = ast.declarations[0].methods[0];
      const whileStatement = method.body[0];
      expect(whileStatement).toBeInstanceOf(WhileNode);
      expect(whileStatement.condition).toBeInstanceOf(IdentifierNode);
      expect(whileStatement.body).toBeInstanceOf(BlockNode);
    });

    test('should parse return statements', () => {
      const source = `
        component TestComponent {
          getValue() {
            return 42
          }
          getNothing() {
            return
          }
          render() { <div>Test</div> }
        }
      `;
      const ast = parseSource(source);

      const getValue = ast.declarations[0].methods[0];
      const returnWithValue = getValue.body[0];
      expect(returnWithValue).toBeInstanceOf(ReturnNode);
      expect(returnWithValue.expression).toBeInstanceOf(NumberLiteralNode);

      const getNothing = ast.declarations[0].methods[1];
      const returnWithoutValue = getNothing.body[0];
      expect(returnWithoutValue).toBeInstanceOf(ReturnNode);
      expect(returnWithoutValue.expression).toBeNull();
    });
  });

  // ============================================================================
  // Expression Parsing Tests
  // ============================================================================

  describe('Expression Parsing', () => {
    test('should parse binary expressions with correct precedence', () => {
      const source = `
        component TestComponent {
          testMethod() {
            result = a + b * c
          }
          render() { <div>Test</div> }
        }
      `;
      const ast = parseSource(source);

      const method = ast.declarations[0].methods[0];
      const assignment = method.body[0].expression;
      expect(assignment).toBeInstanceOf(AssignmentNode);

      const rightSide = assignment.right;
      expect(rightSide).toBeInstanceOf(BinaryExpressionNode);
      expect(rightSide.operator.type).toBe('PLUS');
      expect(rightSide.right).toBeInstanceOf(BinaryExpressionNode);
      expect(rightSide.right.operator.type).toBe('MULTIPLY');
    });

    test('should parse unary expressions', () => {
      const source = `
        component TestComponent {
          testMethod() {
            result = !condition
            value = -number
            counter++
          }
          render() { <div>Test</div> }
        }
      `;
      const ast = parseSource(source);

      const method = ast.declarations[0].methods[0];

      const notExpression = method.body[0].expression.right;
      expect(notExpression).toBeInstanceOf(UnaryExpressionNode);
      expect(notExpression.operator.type).toBe('LOGICAL_NOT');
      expect(notExpression.isPrefix).toBe(true);

      const negativeExpression = method.body[1].expression.right;
      expect(negativeExpression).toBeInstanceOf(UnaryExpressionNode);
      expect(negativeExpression.operator.type).toBe('MINUS');

      const incrementExpression = method.body[2].expression;
      expect(incrementExpression).toBeInstanceOf(UnaryExpressionNode);
      expect(incrementExpression.operator.type).toBe('INCREMENT');
      expect(incrementExpression.isPrefix).toBe(false);
    });

    test('should parse conditional (ternary) expressions', () => {
      const source = `
        component TestComponent {
          testMethod() {
            result = condition ? trueValue : falseValue
          }
          render() { <div>Test</div> }
        }
      `;
      const ast = parseSource(source);

      const method = ast.declarations[0].methods[0];
      const conditional = method.body[0].expression.right;
      expect(conditional).toBeInstanceOf(ConditionalNode);
      expect(conditional.condition).toBeInstanceOf(IdentifierNode);
      expect(conditional.trueExpression).toBeInstanceOf(IdentifierNode);
      expect(conditional.falseExpression).toBeInstanceOf(IdentifierNode);
    });

    test('should parse member expressions', () => {
      const source = `
        component TestComponent {
          testMethod() {
            value = obj.property
            item = arr[index]
          }
          render() { <div>Test</div> }
        }
      `;
      const ast = parseSource(source);

      const method = ast.declarations[0].methods[0];

      const dotAccess = method.body[0].expression.right;
      expect(dotAccess).toBeInstanceOf(MemberNode);
      expect(dotAccess.computed).toBe(false);

      const bracketAccess = method.body[1].expression.right;
      expect(bracketAccess).toBeInstanceOf(MemberNode);
      expect(bracketAccess.computed).toBe(true);
    });

    test('should parse function calls', () => {
      const source = `
        component TestComponent {
          testMethod() {
            result = func()
            value = method(arg1, arg2)
          }
          render() { <div>Test</div> }
        }
      `;
      const ast = parseSource(source);

      const method = ast.declarations[0].methods[0];

      const noArgsCall = method.body[0].expression.right;
      expect(noArgsCall).toBeInstanceOf(CallNode);
      expect(noArgsCall.arguments).toHaveLength(0);

      const withArgsCall = method.body[1].expression.right;
      expect(withArgsCall).toBeInstanceOf(CallNode);
      expect(withArgsCall.arguments).toHaveLength(2);
    });
  });

  // ============================================================================
  // Literal Parsing Tests
  // ============================================================================

  describe('Literal Parsing', () => {
    test('should parse string literals', () => {
      const source = `
        component TestComponent {
          testMethod() {
            str1 = "double quotes"
            str2 = 'single quotes'
            str3 = "escaped \\"quotes\\""
          }
          render() { <div>Test</div> }
        }
      `;
      const ast = parseSource(source);

      const method = ast.declarations[0].methods[0];

      const str1 = method.body[0].expression.right;
      expect(str1).toBeInstanceOf(StringLiteralNode);
      expect(str1.value).toBe('double quotes');

      const str2 = method.body[1].expression.right;
      expect(str2).toBeInstanceOf(StringLiteralNode);
      expect(str2.value).toBe('single quotes');
    });

    test('should parse number literals', () => {
      const source = `
        component TestComponent {
          testMethod() {
            int = 42
            float = 3.14
            negative = -10
          }
          render() { <div>Test</div> }
        }
      `;
      const ast = parseSource(source);

      const method = ast.declarations[0].methods[0];

      const intLiteral = method.body[0].expression.right;
      expect(intLiteral).toBeInstanceOf(NumberLiteralNode);
      expect(intLiteral.value).toBe(42);

      const floatLiteral = method.body[1].expression.right;
      expect(floatLiteral).toBeInstanceOf(NumberLiteralNode);
      expect(floatLiteral.value).toBe(3.14);
    });

    test('should parse boolean and null literals', () => {
      const source = `
        component TestComponent {
          testMethod() {
            isTrue = true
            isFalse = false
            nothing = null
          }
          render() { <div>Test</div> }
        }
      `;
      const ast = parseSource(source);

      const method = ast.declarations[0].methods[0];

      const trueLiteral = method.body[0].expression.right;
      expect(trueLiteral).toBeInstanceOf(BooleanLiteralNode);
      expect(trueLiteral.value).toBe(true);

      const falseLiteral = method.body[1].expression.right;
      expect(falseLiteral).toBeInstanceOf(BooleanLiteralNode);
      expect(falseLiteral.value).toBe(false);

      const nullLiteral = method.body[2].expression.right;
      expect(nullLiteral).toBeInstanceOf(NullLiteralNode);
      expect(nullLiteral.value).toBeNull();
    });

    test('should parse array literals', () => {
      const source = `
        component TestComponent {
          testMethod() {
            empty = []
            numbers = [1, 2, 3]
            mixed = [1, "two", true]
          }
          render() { <div>Test</div> }
        }
      `;
      const ast = parseSource(source);

      const method = ast.declarations[0].methods[0];

      const emptyArray = method.body[0].expression.right;
      expect(emptyArray).toBeInstanceOf(ArrayLiteralNode);
      expect(emptyArray.elements).toHaveLength(0);

      const numbersArray = method.body[1].expression.right;
      expect(numbersArray).toBeInstanceOf(ArrayLiteralNode);
      expect(numbersArray.elements).toHaveLength(3);
      expect(numbersArray.elements[0]).toBeInstanceOf(NumberLiteralNode);

      const mixedArray = method.body[2].expression.right;
      expect(mixedArray).toBeInstanceOf(ArrayLiteralNode);
      expect(mixedArray.elements).toHaveLength(3);
      expect(mixedArray.elements[1]).toBeInstanceOf(StringLiteralNode);
      expect(mixedArray.elements[2]).toBeInstanceOf(BooleanLiteralNode);
    });

    test('should parse object literals', () => {
      const source = `
        component TestComponent {
          testMethod() {
            empty = {}
            person = {
              name: "John",
              age: 30,
              active: true
            }
          }
          render() { <div>Test</div> }
        }
      `;
      const ast = parseSource(source);

      const method = ast.declarations[0].methods[0];

      const emptyObject = method.body[0].expression.right;
      expect(emptyObject).toBeInstanceOf(ObjectLiteralNode);
      expect(emptyObject.properties).toHaveLength(0);

      const personObject = method.body[1].expression.right;
      expect(personObject).toBeInstanceOf(ObjectLiteralNode);
      expect(personObject.properties).toHaveLength(3);

      const nameProperty = personObject.properties[0];
      expect(nameProperty).toBeInstanceOf(ObjectPropertyNode);
      expect(nameProperty.key).toBe('name');
      expect(nameProperty.value).toBeInstanceOf(StringLiteralNode);
    });
  });

  // ============================================================================
  // JSX Parsing Tests
  // ============================================================================

  describe('JSX Parsing', () => {
    test('should parse self-closing JSX elements', () => {
      const source = `
        component TestComponent {
          render() {
            <input type="text" />
          }
        }
      `;
      const ast = parseSource(source);

      const renderMethod = ast.declarations[0].renderMethod;
      const jsxElement = renderMethod.body[0].expression;
      expect(jsxElement).toBeInstanceOf(JSXElementNode);
      expect(jsxElement.tagName).toBe('input');
      expect(jsxElement.selfClosing).toBe(true);
      expect(jsxElement.attributes).toHaveLength(1);
      expect(jsxElement.children).toHaveLength(0);
    });

    test('should parse JSX elements with children', () => {
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

      const renderMethod = ast.declarations[0].renderMethod;
      const jsxElement = renderMethod.body[0].expression;
      expect(jsxElement).toBeInstanceOf(JSXElementNode);
      expect(jsxElement.tagName).toBe('div');
      expect(jsxElement.selfClosing).toBe(false);
      expect(jsxElement.children).toHaveLength(2);

      const h1Element = jsxElement.children[0];
      expect(h1Element).toBeInstanceOf(JSXElementNode);
      expect(h1Element.tagName).toBe('h1');
      expect(h1Element.children).toHaveLength(1);
      expect(h1Element.children[0]).toBeInstanceOf(JSXTextNode);
    });

    test('should parse JSX attributes', () => {
      const source = `
        component TestComponent {
          render() {
            <button
              type="submit"
              onClick={this.handleClick}
              disabled={this.isDisabled}
              className="btn-primary"
            >
              Click me
            </button>
          }
        }
      `;
      const ast = parseSource(source);

      const renderMethod = ast.declarations[0].renderMethod;
      const jsxElement = renderMethod.body[0].expression;
      expect(jsxElement.attributes).toHaveLength(4);

      const typeAttr = jsxElement.attributes[0];
      expect(typeAttr.name).toBe('type');
      expect(typeAttr.value).toBeInstanceOf(StringLiteralNode);

      const onClickAttr = jsxElement.attributes[1];
      expect(onClickAttr.name).toBe('onClick');
      expect(onClickAttr.value).toBeInstanceOf(JSXExpressionNode);
      expect(onClickAttr.value.expression).toBeInstanceOf(MemberNode);
    });

    test('should parse JSX expressions in children', () => {
      const source = `
        component TestComponent {
          render() {
            <div>
              Hello {this.name}!
              Count: {this.count + 1}
            </div>
          }
        }
      `;
      const ast = parseSource(source);

      const renderMethod = ast.declarations[0].renderMethod;
      const jsxElement = renderMethod.body[0].expression;
      expect(jsxElement.children).toHaveLength(4); // text, expression, text, expression

      const nameExpression = jsxElement.children[1];
      expect(nameExpression).toBeInstanceOf(JSXExpressionNode);
      expect(nameExpression.expression).toBeInstanceOf(MemberNode);

      const countExpression = jsxElement.children[3];
      expect(countExpression).toBeInstanceOf(JSXExpressionNode);
      expect(countExpression.expression).toBeInstanceOf(BinaryExpressionNode);
    });

    test('should reject mismatched JSX tags', () => {
      const source = `
        component TestComponent {
          render() {
            <div>
              <span>Content</div>
            </div>
          }
        }
      `;
      expect(() => parseSource(source)).toThrow(ParseError);
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    test('should report missing component name', () => {
      expect(() => {
        parseSource('component { render() { <div>Test</div> } }');
      }).toThrow(ParseError);
    });

    test('should report missing opening brace', () => {
      expect(() => {
        parseSource('component Test render() { <div>Test</div> } }');
      }).toThrow(ParseError);
    });

    test('should report missing closing brace', () => {
      expect(() => {
        parseSource('component Test { render() { <div>Test</div> }');
      }).toThrow(ParseError);
    });

    test('should report invalid property syntax', () => {
      expect(() => {
        parseSource(`
          component Test {
            state {
              invalid property syntax
            }
            render() { <div>Test</div> }
          }
        `);
      }).toThrow(ParseError);
    });

    test('should report missing method parameters parentheses', () => {
      expect(() => {
        parseSource(`
          component Test {
            method { return true }
            render() { <div>Test</div> }
          }
        `);
      }).toThrow(ParseError);
    });

    test('should synchronize after errors', () => {
      // This test ensures the parser can recover from errors and continue parsing
      const source = `
        component First {
          invalid syntax here
          render() { <div>First</div> }
        }

        component Second {
          render() { <div>Second</div> }
        }
      `;

      // The parser should throw an error but still attempt to parse what it can
      expect(() => parseSource(source)).toThrow(ParseError);
    });

    test('should provide location information in errors', () => {
      try {
        parseSource(`
          component Test {
            state {
              prop: invalid_type_syntax
            }
            render() { <div>Test</div> }
          }
        `);
        fail('Expected ParseError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ParseError);
        expect(error.location).toBeDefined();
        expect(error.location.line).toBeGreaterThan(0);
        expect(error.location.column).toBeGreaterThan(0);
      }
    });
  });

  // ============================================================================
  // Complex Integration Tests
  // ============================================================================

  describe('Complex Integration Tests', () => {
    test('should parse complete TodoApp component', () => {
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

          render() {
            <div class="todo-app">
              <h1>TodoLang Todo App</h1>
              <TodoInput onAdd={this.addTodo} />
              <TodoList
                todos={this.filteredTodos}
                onToggle={this.toggleTodo}
                onEdit={this.editTodo}
                onDelete={this.deleteTodo}
              />
              <TodoFilter
                current={this.filter}
                onChange={this.setFilter}
              />
            </div>
          }
        }
      `;

      const ast = parseSource(source);
      expect(ast.declarations).toHaveLength(1);

      const component = ast.declarations[0];
      expect(component).toBeInstanceOf(ComponentNode);
      expect(component.name).toBe('TodoApp');
      expect(component.stateDeclaration).toBeInstanceOf(StateNode);
      expect(component.stateDeclaration.properties).toHaveLength(3);
      expect(component.computedProperties).toHaveLength(1);
      expect(component.methods).toHaveLength(2);
      expect(component.renderMethod).toBeInstanceOf(RenderNode);
    });

    test('should parse multiple declarations', () => {
      const source = `
        model Todo {
          id: string
          text: string
          completed: boolean = false

          static create(text: string): Todo {
            return Todo {
              id: generateId(),
              text: text
            }
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
        }

        component TodoApp {
          state {
            todos: Todo[] = []
          }

          render() {
            <div>App</div>
          }
        }
      `;

      const ast = parseSource(source);
      expect(ast.declarations).toHaveLength(3);
      expect(ast.declarations[0]).toBeInstanceOf(ModelNode);
      expect(ast.declarations[1]).toBeInstanceOf(ServiceNode);
      expect(ast.declarations[2]).toBeInstanceOf(ComponentNode);
    });
  });
});