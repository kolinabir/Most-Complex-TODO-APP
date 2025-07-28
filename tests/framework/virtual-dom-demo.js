/**
 * Virtual DOM Demo
 *
 * A simple demonstration of the virtual DOM system in action
 */

import {
  createElement,
  createTextNode,
  createFragment,
  VirtualDOMRenderer,
  h
} from '../../src/framework/components/virtual-dom.js';

// Mock DOM for demo
class MockDOM {
  constructor() {
    this.container = {
      tagName: 'div',
      children: [],
      childNodes: [],
      innerHTML: '',
      appendChild: function(child) {
        this.children.push(child);
        this.childNodes.push(child);
        child.parentNode = this;
        return child;
      },
      removeChild: function(child) {
        const index = this.children.indexOf(child);
        if (index > -1) {
          this.children.splice(index, 1);
          this.childNodes.splice(index, 1);
          child.parentNode = null;
        }
        return child;
      }
    };
  }

  createElement(tagName) {
    return {
      tagName: tagName.toLowerCase(),
      children: [],
      childNodes: [],
      attributes: {},
      style: {},
      className: '',
      textContent: '',
      parentNode: null,
      eventListeners: {},
      appendChild: function(child) {
        this.children.push(child);
        this.childNodes.push(child);
        child.parentNode = this;
        return child;
      },
      removeChild: function(child) {
        const index = this.children.indexOf(child);
        if (index > -1) {
          this.children.splice(index, 1);
          this.childNodes.splice(index, 1);
          child.parentNode = null;
        }
        return child;
      },
      replaceChild: function(newChild, oldChild) {
        const index = this.children.indexOf(oldChild);
        if (index > -1) {
          this.children[index] = newChild;
          this.childNodes[index] = newChild;
          newChild.parentNode = this;
          oldChild.parentNode = null;
        }
        return oldChild;
      },
      setAttribute: function(name, value) {
        this.attributes[name] = value;
      },
      removeAttribute: function(name) {
        delete this.attributes[name];
      },
      addEventListener: function(type, handler) {
        if (!this.eventListeners[type]) {
          this.eventListeners[type] = [];
        }
        this.eventListeners[type].push(handler);
      },
      removeEventListener: function(type, handler) {
        if (this.eventListeners[type]) {
          const index = this.eventListeners[type].indexOf(handler);
          if (index > -1) {
            this.eventListeners[type].splice(index, 1);
          }
        }
      }
    };
  }

  createTextNode(text) {
    return {
      nodeType: 3,
      textContent: text,
      parentNode: null
    };
  }

  createDocumentFragment() {
    return {
      children: [],
      childNodes: [],
      appendChild: function(child) {
        this.children.push(child);
        this.childNodes.push(child);
        return child;
      }
    };
  }
}

// Set up mock DOM
const mockDOM = new MockDOM();
global.document = mockDOM;

/**
 * Demo: Basic Virtual DOM Operations
 */
function demoBasicOperations() {
  console.log('\n🎭 Virtual DOM Demo: Basic Operations');
  console.log('=====================================');

  // Create virtual nodes
  const textNode = createTextNode('Hello World');
  const elementNode = createElement('div', { id: 'test', className: 'demo' }, textNode);

  console.log('✅ Created virtual nodes:');
  console.log('   Text node:', textNode.props.textContent);
  console.log('   Element node:', elementNode.type, 'with props:', elementNode.props);

  // Test h alias
  const hNode = h('span', { style: { color: 'blue' } }, 'Using h() alias');
  console.log('✅ Created node with h() alias:', hNode.type);

  // Create fragment
  const fragment = createFragment(
    h('h1', {}, 'Title'),
    h('p', {}, 'Paragraph'),
    h('button', { onClick: () => console.log('Clicked!') }, 'Click me')
  );
  console.log('✅ Created fragment with', fragment.children.length, 'children');
}

/**
 * Demo: Virtual DOM Rendering
 */
function demoRendering() {
  console.log('\n🎨 Virtual DOM Demo: Rendering');
  console.log('==============================');

  const renderer = new VirtualDOMRenderer();
  const container = mockDOM.container;

  // Initial render
  const vnode1 = h('div', { id: 'app' },
    h('h1', {}, 'Todo App'),
    h('ul', {},
      h('li', {}, 'Task 1'),
      h('li', {}, 'Task 2')
    )
  );

  renderer.render(vnode1, container);
  console.log('✅ Initial render complete');
  console.log('   Container children:', container.children.length);
  console.log('   App div children:', container.children[0].children.length);

  // Update render
  const vnode2 = h('div', { id: 'app', className: 'updated' },
    h('h1', {}, 'Updated Todo App'),
    h('ul', {},
      h('li', {}, 'Task 1'),
      h('li', {}, 'Task 2'),
      h('li', {}, 'Task 3 (New!)')
    ),
    h('footer', {}, 'Footer added')
  );

  renderer.render(vnode2, container);
  console.log('✅ Update render complete');
  console.log('   App div now has className:', container.children[0].className);
  console.log('   App div children:', container.children[0].children.length);
  console.log('   List items:', container.children[0].children[1].children.length);
}

/**
 * Demo: Event Handling
 */
function demoEventHandling() {
  console.log('\n🎯 Virtual DOM Demo: Event Handling');
  console.log('===================================');

  const renderer = new VirtualDOMRenderer();
  const container = mockDOM.createElement('div');

  let clickCount = 0;
  const handleClick = () => {
    clickCount++;
    console.log(`   Button clicked! Count: ${clickCount}`);
  };

  const vnode = h('div', {},
    h('button', { onClick: handleClick }, `Click me (${clickCount})`),
    h('p', {}, 'Click the button above')
  );

  renderer.render(vnode, container);
  console.log('✅ Rendered component with event handler');

  // Simulate click event
  const button = container.children[0].children[0];
  if (button.eventListeners.click) {
    button.eventListeners.click[0]({ type: 'click', target: button });
    console.log('✅ Simulated click event');
  }
}

/**
 * Demo: Complex Component Structure
 */
function demoComplexStructure() {
  console.log('\n🏗️  Virtual DOM Demo: Complex Structure');
  console.log('=======================================');

  const renderer = new VirtualDOMRenderer();
  const container = mockDOM.createElement('div');

  // Create a complex nested structure
  const createTodoItem = (id, text, completed = false) => {
    return h('li', { key: id, className: completed ? 'completed' : 'active' },
      h('input', {
        type: 'checkbox',
        checked: completed,
        onChange: () => console.log(`Toggle todo ${id}`)
      }),
      h('span', { className: 'todo-text' }, text),
      h('button', {
        className: 'delete-btn',
        onClick: () => console.log(`Delete todo ${id}`)
      }, 'Delete')
    );
  };

  const todoApp = h('div', { className: 'todo-app' },
    h('header', {},
      h('h1', {}, 'My Todo App'),
      h('input', {
        type: 'text',
        placeholder: 'Add new todo...',
        onKeyPress: (e) => {
          if (e.key === 'Enter') {
            console.log('Add new todo:', e.target.value);
          }
        }
      })
    ),
    h('main', {},
      h('ul', { className: 'todo-list' },
        createTodoItem(1, 'Learn Virtual DOM', true),
        createTodoItem(2, 'Build Todo App', false),
        createTodoItem(3, 'Write Tests', false)
      )
    ),
    h('footer', {},
      h('p', {}, '3 items total, 1 completed')
    )
  );

  renderer.render(todoApp, container);
  console.log('✅ Rendered complex todo app structure');
  console.log('   Main container children:', container.children[0].children.length);
  console.log('   Todo list items:', container.children[0].children[1].children[0].children.length);

  // Simulate some interactions
  const firstCheckbox = container.children[0].children[1].children[0].children[0].children[0];
  const deleteButton = container.children[0].children[1].children[0].children[0].children[2];

  if (firstCheckbox.eventListeners.change) {
    firstCheckbox.eventListeners.change[0]({ type: 'change', target: firstCheckbox });
  }

  if (deleteButton.eventListeners.click) {
    deleteButton.eventListeners.click[0]({ type: 'click', target: deleteButton });
  }
}

/**
 * Run all demos
 */
function runAllDemos() {
  console.log('🚀 Starting Virtual DOM System Demo');
  console.log('====================================');

  try {
    demoBasicOperations();
    demoRendering();
    demoEventHandling();
    demoComplexStructure();

    console.log('\n🎉 All Virtual DOM demos completed successfully!');
    console.log('✅ Virtual DOM system is working correctly');

  } catch (error) {
    console.error('\n❌ Demo failed:', error.message);
    console.error(error.stack);
  }
}

// Run demos if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllDemos();
}

export { runAllDemos };