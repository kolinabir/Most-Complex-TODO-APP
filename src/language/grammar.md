# TodoLang Grammar Specification

## Overview

TodoLang is a domain-specific language designed for building reactive UI applications with a focus on todo applications. It features JSX-like syntax for UI components, built-in state management, and declarative component definitions.

## Token Definitions

### Keywords
- `component` - Defines a UI component
- `state` - Defines component state
- `render` - Defines component render method
- `computed` - Defines computed properties
- `model` - Defines data models
- `service` - Defines services
- `static` - Static methods/properties
- `if`, `else` - Conditional statements
- `for`, `while` - Loop statements
- `return` - Return statement
- `this` - Self reference
- `true`, `false` - Boolean literals
- `null` - Null literal

### Operators
- `=` - Assignment
- `==`, `!=` - Equality/inequality
- `<`, `>`, `<=`, `>=` - Comparison
- `+`, `-`, `*`, `/`, `%` - Arithmetic
- `&&`, `||`, `!` - Logical
- `++`, `--` - Increment/decrement
- `+=`, `-=`, `*=`, `/=` - Compound assignment
- `?` - Optional type modifier
- `.` - Property access
- `[]` - Array access/type

### Delimiters
- `{`, `}` - Block delimiters
- `(`, `)` - Expression grouping, function calls
- `[`, `]` - Array literals, indexing
- `<`, `>` - JSX element delimiters
- `;` - Statement terminator
- `,` - Separator
- `:` - Type annotation, object property
- `"`, `'` - String delimiters

### Literals
- **String**: `"hello"`, `'world'`
- **Number**: `42`, `3.14`, `-10`
- **Boolean**: `true`, `false`
- **Array**: `[1, 2, 3]`
- **Object**: `{ key: value }`

### Identifiers
- Component names: PascalCase (e.g., `TodoApp`, `TodoItem`)
- Variable names: camelCase (e.g., `todoText`, `isCompleted`)
- Property names: camelCase (e.g., `onClick`, `className`)

## Grammar Rules (EBNF)

```ebnf
Program = { Declaration } ;

Declaration = ComponentDeclaration
            | ModelDeclaration
            | ServiceDeclaration ;

ComponentDeclaration = "component" Identifier "{"
                      [ StateDeclaration ]
                      { MethodDeclaration | ComputedDeclaration }
                      RenderDeclaration
                      "}" ;

StateDeclaration = "state" "{" { PropertyDeclaration } "}" ;

PropertyDeclaration = Identifier ":" Type [ "=" Expression ] ;

MethodDeclaration = Identifier "(" [ ParameterList ] ")" "{" { Statement } "}" ;

ComputedDeclaration = "computed" Identifier "(" ")" "{" { Statement } "}" ;

RenderDeclaration = "render" "(" ")" "{" JSXElement "}" ;

ModelDeclaration = "model" Identifier "{" { PropertyDeclaration | MethodDeclaration } "}" ;

ServiceDeclaration = "service" Identifier "{" { MethodDeclaration } "}" ;

JSXElement = "<" Identifier [ JSXAttributes ] [ "/" ] ">"
           | "<" Identifier [ JSXAttributes ] ">" { JSXChild } "</" Identifier ">" ;

JSXAttributes = { JSXAttribute } ;

JSXAttribute = Identifier "=" "{" Expression "}"
             | Identifier "=" StringLiteral ;

JSXChild = JSXElement | JSXText | "{" Expression "}" ;

Statement = ExpressionStatement
          | IfStatement
          | ForStatement
          | WhileStatement
          | ReturnStatement
          | BlockStatement ;

Expression = AssignmentExpression ;

AssignmentExpression = ConditionalExpression [ AssignmentOperator AssignmentExpression ] ;

ConditionalExpression = LogicalOrExpression [ "?" Expression ":" ConditionalExpression ] ;

LogicalOrExpression = LogicalAndExpression { "||" LogicalAndExpression } ;

LogicalAndExpression = EqualityExpression { "&&" EqualityExpression } ;

EqualityExpression = RelationalExpression { ( "==" | "!=" ) RelationalExpression } ;

RelationalExpression = AdditiveExpression { ( "<" | ">" | "<=" | ">=" ) AdditiveExpression } ;

AdditiveExpression = MultiplicativeExpression { ( "+" | "-" ) MultiplicativeExpression } ;

MultiplicativeExpression = UnaryExpression { ( "*" | "/" | "%" ) UnaryExpression } ;

UnaryExpression = PostfixExpression
                | ( "++" | "--" | "+" | "-" | "!" ) UnaryExpression ;

PostfixExpression = PrimaryExpression { ( "++" | "--" | "[" Expression "]" | "." Identifier | "(" [ ArgumentList ] ")" ) } ;

PrimaryExpression = Identifier
                  | Literal
                  | "(" Expression ")"
                  | "this" ;

Type = Identifier [ "?" ] [ "[" "]" ] ;

Literal = StringLiteral | NumberLiteral | BooleanLiteral | ArrayLiteral | ObjectLiteral | "null" ;
```

## Example TodoLang Code

```todolang
// Data model definition
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
}

// Service definition
service StorageService {
  save(key: string, data: any): void {
    localStorage.setItem(key, JSON.stringify(data))
  }

  load(key: string): any? {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : null
  }
}

// Component definition
component TodoApp {
  state {
    todos: Todo[] = []
    filter: string = "all"
    editingId: string? = null
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
}
```

## Compilation Target

TodoLang compiles to modern JavaScript (ES6+) with the following transformations:

1. **Components** → JavaScript classes with lifecycle methods
2. **State** → Reactive properties with getters/setters
3. **JSX Elements** → Virtual DOM function calls
4. **Computed Properties** → Cached getter methods
5. **Models** → JavaScript classes with validation
6. **Services** → Singleton service classes

## Type System

TodoLang includes a simple type system for better development experience:

- **Primitive Types**: `string`, `number`, `boolean`, `Date`
- **Array Types**: `Type[]` (e.g., `Todo[]`, `string[]`)
- **Optional Types**: `Type?` (e.g., `string?`, `Todo?`)
- **Object Types**: Custom model types
- **Function Types**: Inferred from method signatures

## Error Handling

The language supports comprehensive error reporting:

- **Lexical Errors**: Invalid characters, unterminated strings
- **Syntax Errors**: Invalid grammar, missing tokens
- **Type Errors**: Type mismatches, undefined properties
- **Runtime Errors**: Null references, method not found