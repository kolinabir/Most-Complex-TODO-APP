# Enterprise Todo Application

An extremely over-engineered todo application built with a custom programming language called **TodoLang**.

## Project Overview

This project demonstrates the ultimate level of over-engineering by creating a custom domain-specific language (DSL) from scratch, then building an entire framework stack, and finally implementing a simple todo application using our custom language.

### What We're Building

1. **TodoLang**: A custom programming language with JSX-like syntax
2. **Custom Compiler**: Lexer, parser, and transpiler to JavaScript
3. **Custom Framework**: State management, virtual DOM, routing, storage
4. **Todo Application**: Written entirely in TodoLang

## Project Structure

```
├── .kiro/
│   ├── specs/enterprise-todo-app/     # Project specifications
│   └── steering/                      # AI assistant guidance
├── src/
│   ├── language/                      # TodoLang compiler implementation
│   │   ├── lexer/                    # Tokenization logic
│   │   ├── parser/                   # AST generation
│   │   ├── compiler/                 # JavaScript code generation
│   │   ├── runtime/                  # Language runtime support
│   │   ├── grammar.md                # Language specification
│   │   └── tokens.js                 # Token definitions
│   ├── framework/                    # Custom framework components
│   │   ├── state/                    # Reactive state management
│   │   ├── components/               # Component system and virtual DOM
│   │   ├── router/                   # Client-side routing
│   │   └── storage/                  # Storage abstraction layer
│   └── app/                          # TodoLang application source
│       ├── components/               # UI components (*.todolang)
│       ├── models/                   # Data models
│       └── services/                 # Application services
├── tests/                            # Test suites
├── dist/                             # Compiled output
├── build.js                          # Build system
├── dev-server.js                     # Development server
├── test-runner.js                    # Test runner
└── package.json                      # Project configuration
```

## Getting Started

### Prerequisites

- Node.js 16.0.0 or higher

### Installation

1. Clone the repository
2. No external dependencies needed - everything is built from scratch!

### Development Commands

```bash
# Build the project
node build.js --dev

# Start development server with hot reloading
node dev-server.js

# Run tests
node test-runner.js

# Run specific test types
node test-runner.js --type integration
node test-runner.js --type lexer,parser,compiler

# Build for production
node build.js --production --minify --source-maps
```

## Current Status

✅ **Task 1 Complete**: Project structure and language foundation
- Directory structure created
- TodoLang grammar specification defined
- Token definitions implemented
- Build pipeline established
- Development server created
- Test runner implemented

🔄 **Next Steps**:
- Task 2: Implement TodoLang lexer (tokenizer)
- Task 3: Build TodoLang parser for AST generation
- Task 4: Create TodoLang compiler/transpiler

## TodoLang Language Preview

Here's what TodoLang code looks like:

```todolang
// Data model
model Todo {
  id: string
  text: string
  completed: boolean = false
  createdAt: Date = Date.now()
}

// Component definition
component TodoApp {
  state {
    todos: Todo[] = []
    filter: string = "all"
  }

  render() {
    <div class="todo-app">
      <h1>My Todos</h1>
      <TodoInput onAdd={this.addTodo} />
      <TodoList todos={this.filteredTodos} />
      <TodoFilter current={this.filter} onChange={this.setFilter} />
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
    this.todos.push(Todo.create(text))
  }
}
```

## Architecture Highlights

- **Zero External Dependencies**: Everything built from scratch
- **Custom Language**: Domain-specific syntax optimized for UI development
- **Reactive State**: Automatic UI updates when state changes
- **Virtual DOM**: Efficient rendering with custom diffing algorithm
- **Type System**: Optional typing for better development experience
- **Source Maps**: Debug TodoLang code directly in browser
- **Hot Reloading**: Instant feedback during development

## Testing

The project includes comprehensive testing at multiple levels:

- **Language Tests**: Lexer, parser, and compiler functionality
- **Framework Tests**: State management, virtual DOM, routing
- **Integration Tests**: Build system and project structure
- **E2E Tests**: Complete user workflows (coming soon)

Run tests with:
```bash
node test-runner.js --type integration
```

## Build System

The custom build system:

1. **Compiles** TodoLang files to JavaScript
2. **Bundles** framework and runtime components
3. **Generates** HTML template with proper script loading
4. **Creates** development and production builds
5. **Supports** source maps and minification

## Development Server

The development server provides:

- **Static File Serving**: Serves compiled application
- **Hot Reloading**: Automatic rebuilds on file changes
- **Error Handling**: Graceful error pages
- **SPA Support**: Client-side routing support

Start with:
```bash
node dev-server.js --port 3000
```

## Contributing

This is an educational project demonstrating extreme over-engineering. Each component is built from scratch to show how modern web frameworks work under the hood.

## License

MIT License - Feel free to learn from this over-engineered masterpiece!