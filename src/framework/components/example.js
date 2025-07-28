/**
 * Example Component Usage
 *
 * This file demonstrates how to use the custom component framework
 *th lifecycle methods, state management, and rendering.
 */

import {
  TodoLangComponent,
  registerComponent,
  createComponent
} from './component.js';
import { createElement } from './virtual-dom.js';

/**
 * Example Counter Component
 */
class CounterComponent extends TodoLangComponent {
  getInitialState() {
    return {
      count: 0,
      step: 1
    };
  }

  render() {
    return createElement('div', { className: 'counter-component' }, [
      createElement('h2', {}, 'Counter Example'),
      createElement('p', {}, `Current count: ${this.state.count}`),
      createElement('div', { className: 'controls' }, [
        createElement('button', {
          onClick: () => this.decrement()
        }, '-'),
        createElement('span', { className: 'count-display' }, this.state.count),
        createElement('button', {
          onClick: () => this.increment()
        }, '+'),
      ]),
      createElement('div', { className: 'step-control' }, [
        createElement('label', {}, 'Step: '),
        createElement('input', {
          type: 'number',
          value: this.state.step,
          onChange: (e) => this.setStep(parseInt(e.target.value) || 1)
        })
      ]),
      createElement('button', {
        onClick: () => this.reset(),
        className: 'reset-button'
      }, 'Reset')
    ]);
  }

  increment() {
    this.setState({ count: this.state.count + this.state.step });
  }

  decrement() {
    this.setState({ count: this.state.count - this.state.step });
  }

  setStep(step) {
    this.setState({ step: Math.max(1, step) });
  }

  reset() {
    this.setState({ count: 0, step: 1 });
  }

  // Lifecycle hooks
  created() {
    console.log('Counter component created');
  }

  mounted() {
    console.log('Counter component mounted');
    this.emit('counter-mounted', { id: this.id });
  }

  updated() {
    console.log(`Counter updated: count = ${this.state.count}`);
    this.emit('counter-updated', { count: this.state.count });
  }

  beforeUnmount() {
    console.log('Counter component will unmount');
  }
}

/**
 * Example Todo Item Component
 */
class TodoItemComponent extends TodoLangComponent {
  getInitialState() {
    return {
      isEditing: false,
      editText: this.props.text || ''
    };
  }

  render() {
    const { id, text, completed } = this.props;
    const { isEditing, editText } = this.state;

    if (isEditing) {
      return createElement('li', { className: 'todo-item editing' }, [
        createElement('input', {
          type: 'text',
          value: editText,
          onChange: (e) => this.setState({ editText: e.target.value }),
          onKeyDown: (e) => this.handleKeyDown(e),
          onBlur: () => this.saveEdit(),
          ref: (el) => el && el.focus()
        }),
        createElement('button', {
          onClick: () => this.saveEdit()
        }, 'Save'),
        createElement('button', {
          onClick: () => this.cancelEdit()
        }, 'Cancel')
      ]);
    }

    return createElement('li', {
      className: `todo-item ${completed ? 'completed' : ''}`
    }, [
      createElement('input', {
        type: 'checkbox',
        checked: completed,
        onChange: () => this.toggleComplete()
      }),
      createElement('span', {
        className: 'todo-text',
        onDoubleClick: () => this.startEdit()
      }, text),
      createElement('button', {
        onClick: () => this.startEdit(),
        className: 'edit-button'
      }, 'Edit'),
      createElement('button', {
        onClick: () => this.deleteTodo(),
        className: 'delete-button'
      }, 'Delete')
    ]);
  }

  toggleComplete() {
    this.emit('todo-toggle', { id: this.props.id });
  }

  startEdit() {
    this.setState({
      isEditing: true,
      editText: this.props.text
    });
  }

  saveEdit() {
    const trimmedText = this.state.editText.trim();
    if (trimmedText) {
      this.emit('todo-update', {
        id: this.props.id,
        text: trimmedText
      });
    }
    this.setState({ isEditing: false });
  }

  cancelEdit() {
    this.setState({
      isEditing: false,
      editText: this.props.text
    });
  }

  deleteTodo() {
    this.emit('todo-delete', { id: this.props.id });
  }

  handleKeyDown(e) {
    if (e.key === 'Enter') {
      this.saveEdit();
    } else if (e.key === 'Escape') {
      this.cancelEdit();
    }
  }
}

/**
 * Example App Component that uses child components
 */
class ExampleAppComponent extends TodoLangComponent {
  getInitialState() {
    return {
      todos: [
        { id: 1, text: 'Learn TodoLang', completed: false },
        { id: 2, text: 'Build component framework', completed: true },
        { id: 3, text: 'Create example app', completed: false }
      ],
      nextId: 4
    };
  }

  render() {
    return createElement('div', { className: 'example-app' }, [
      createElement('h1', {}, 'TodoLang Component Framework Example'),

      // Counter component section
      createElement('section', { className: 'counter-section' }, [
        createElement('div', { id: 'counter-container' })
      ]),

      // Todo list section
      createElement('section', { className: 'todo-section' }, [
        createElement('h2', {}, 'Todo List'),
        createElement('ul', { className: 'todo-list' },
          this.state.todos.map(todo =>
            createElement('div', {
              key: todo.id,
              id: `todo-${todo.id}`
            })
          )
        )
      ])
    ]);
  }

  mounted() {
    // Create and mount counter component
    this.counterComponent = new CounterComponent();
    const counterContainer = this._container.querySelector('#counter-container');
    this.counterComponent.mount(counterContainer);
    this.addChild('counter', this.counterComponent);

    // Listen to counter events
    this.counterComponent.addEventListener('counter-updated', (data) => {
      console.log('Counter updated:', data);
    });

    // Create and mount todo item components
    this.state.todos.forEach(todo => {
      this.createTodoComponent(todo);
    });
  }

  createTodoComponent(todo) {
    const todoComponent = new TodoItemComponent(todo);
    const todoContainer = this._container.querySelector(`#todo-${todo.id}`);

    if (todoContainer) {
      todoComponent.mount(todoContainer);
      this.addChild(`todo-${todo.id}`, todoComponent);

      // Listen to todo events
      todoComponent.addEventListener('todo-toggle', (data) => {
        this.toggleTodo(data.id);
      });

      todoComponent.addEventListener('todo-update', (data) => {
        this.updateTodo(data.id, data.text);
      });

      todoComponent.addEventListener('todo-delete', (data) => {
        this.deleteTodo(data.id);
      });
    }
  }

  toggleTodo(id) {
    const todos = this.state.todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
    this.setState({ todos });
  }

  updateTodo(id, text) {
    const todos = this.state.todos.map(todo =>
      todo.id === id ? { ...todo, text } : todo
    );
    this.setState({ todos });
  }

  deleteTodo(id) {
    const todos = this.state.todos.filter(todo => todo.id !== id);
    this.setState({ todos });

    // Remove child component
    this.removeChild(`todo-${id}`);
  }
}

// Register components globally
registerComponent('Counter', CounterComponent);
registerComponent('TodoItem', TodoItemComponent);
registerComponent('ExampleApp', ExampleAppComponent);

// Export for use in other modules
export {
  CounterComponent,
  TodoItemComponent,
  ExampleAppComponent
};

// Example usage function
export function runExample() {
  // Create a container element
  const container = document.createElement('div');
  container.id = 'app-container';
  document.body.appendChild(container);

  // Create and mount the example app
  const app = createComponent('ExampleApp');
  app.mount(container);

  console.log('Example app mounted successfully!');
  console.log('App debug info:', app.getDebugInfo());

  return app;
}