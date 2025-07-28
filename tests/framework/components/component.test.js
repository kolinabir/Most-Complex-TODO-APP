/**
 * Tests for Custom Component Framework
 *
 * Tests component lifecycle, rendering behavior, state management integration,
 * and component retration system.
 */

import {
  TodoLangComponent,
  ComponentRegistry,
  ComponentState,
  registerComponent,
  createComponent,
  globalRegistry
} from '../../../src/framework/components/component.js';
import { createElement } from '../../../src/framework/components/virtual-dom.js';

/**
 * Test Component Classes
 */
class TestComponent extends TodoLangComponent {
  getInitialState() {
    return {
      count: 0,
      message: 'Hello World'
    };
  }

  render() {
    return createElement('div', {
      className: 'test-component',
      'data-count': this.state.count
    }, [
      createElement('h1', {}, this.state.message),
      createElement('p', {}, `Count: ${this.state.count}`),
      createElement('button', {
        onClick: () => this.increment()
      }, 'Increment')
    ]);
  }

  increment() {
    this.setState({ count: this.state.count + 1 });
  }

  // Lifecycle hooks for testing
  created() {
    this.lifecycleEvents = this.lifecycleEvents || [];
    this.lifecycleEvents.push('created');
  }

  beforeMount() {
    this.lifecycleEvents = this.lifecycleEvents || [];
    this.lifecycleEvents.push('beforeMount');
  }

  mounted() {
    this.lifecycleEvents = this.lifecycleEvents || [];
    this.lifecycleEvents.push('mounted');
  }

  beforeUpdate() {
    this.lifecycleEvents = this.lifecycleEvents || [];
    this.lifecycleEvents.push('beforeUpdate');
  }

  updated() {
    this.lifecycleEvents = this.lifecycleEvents || [];
    this.lifecycleEvents.push('updated');
  }

  beforeUnmount() {
    this.lifecycleEvents = this.lifecycleEvents || [];
    this.lifecycleEvents.push('beforeUnmount');
  }

  unmounted() {
    this.lifecycleEvents = this.lifecycleEvents || [];
    this.lifecycleEvents.push('unmounted');
  }
}

class ErrorComponent extends TodoLangComponent {
  render() {
    if (this.props.shouldError) {
      throw new Error('Test error in render');
    }
    return createElement('div', {}, 'No error');
  }

  onError(error, phase) {
    this.errorInfo = { error, phase };
    super.onError(error, phase);
  }
}

class ParentComponent extends TodoLangComponent {
  getInitialState() {
    return {
      childProps: { message: 'Child message' }
    };
  }

  render() {
    return createElement('div', { className: 'parent' }, [
      createElement('h1', {}, 'Parent Component'),
      createElement('div', { className: 'child-container' })
    ]);
  }

  mounted() {
    // Create child component
    this.childComponent = new TestComponent(this.state.childProps);
    const childContainer = this._container.querySelector('.child-container');
    this.childComponent.mount(childContainer);
    this.addChild('test-child', this.childComponent);
  }

  beforeUnmount() {
    if (this.childComponent) {
      this.removeChild('test-child');
    }
  }
}

/**
 * Test Utilities
 */
function createTestContainer() {
  const container = document.createElement('div');
  container.id = 'test-container';
  document.body.appendChild(container);
  return container;
}

function cleanupTestContainer(container) {
  if (container && container.parentNode) {
    container.parentNode.removeChild(container);
  }
}

function waitForNextTick() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Component Lifecycle Tests
 */
describe('TodoLangComponent Lifecycle', () => {
  let component;
  let container;

  beforeEach(() => {
    container = createTestContainer();
    component = new TestComponent();
  });

  afterEach(() => {
    if (component && component._isMounted) {
      component.unmount();
    }
    cleanupTestContainer(container);
  });

  test('should initialize component with correct initial state', () => {
    expect(component.id).toBeDefined();
    expect(component.displayName).toBe('TestComponent');
    expect(component.state.count).toBe(0);
    expect(component.state.message).toBe('Hello World');
    expect(component._componentState).toBe(ComponentState.CREATED);
    expect(component.lifecycleEvents).toContain('created');
  });

  test('should mount component correctly', () => {
    component.mount(container);

    expect(component._isMounted).toBe(true);
    expect(component._componentState).toBe(ComponentState.MOUNTED);
    expect(component._container).toBe(container);
    expect(component.lifecycleEvents).toContain('beforeMount');
    expect(component.lifecycleEvents).toContain('mounted');

    // Check DOM rendering
    const renderedElement = container.querySelector('.test-component');
    expect(renderedElement).toBeTruthy();
    expect(renderedElement.getAttribute('data-count')).toBe('0');

    const heading = container.querySelector('h1');
    expect(heading.textContent).toBe('Hello World');

    const paragraph = container.querySelector('p');
    expect(paragraph.textContent).toBe('Count: 0');
  });

  test('should not mount component twice', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    component.mount(container);
    component.mount(container); // Second mount attempt

    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  test('should unmount component correctly', () => {
    component.mount(container);
    component.unmount();

    expect(component._isMounted).toBe(false);
    expect(component._componentState).toBe(ComponentState.UNMOUNTED);
    expect(component._container).toBe(null);
    expect(component.lifecycleEvents).toContain('beforeUnmount');
    expect(component.lifecycleEvents).toContain('unmounted');

    // Check DOM cleanup
    expect(container.innerHTML).toBe('');
  });

  test('should not unmount component that is not mounted', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    component.unmount(); // Unmount without mounting

    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  test('should update component when state changes', async () => {
    component.mount(container);

    // Change state
    component.setState({ count: 5 });

    // Wait for async update
    await waitForNextTick();

    expect(component.lifecycleEvents).toContain('beforeUpdate');
    expect(component.lifecycleEvents).toContain('updated');

    // Check DOM update
    const renderedElement = container.querySelector('.test-component');
    expect(renderedElement.getAttribute('data-count')).toBe('5');

    const paragraph = container.querySelector('p');
    expect(paragraph.textContent).toBe('Count: 5');
  });

  test('should handle force update', () => {
    component.mount(container);
    const initialRenderCount = component._renderCount;

    component.forceUpdate();

    expect(component._renderCount).toBe(initialRenderCount + 1);
    expect(component.lifecycleEvents).toContain('beforeUpdate');
    expect(component.lifecycleEvents).toContain('updated');
  });
});

/**
 * Component State Management Tests
 */
describe('Component State Management', () => {
  let component;
  let container;

  beforeEach(() => {
    container = createTestContainer();
    component = new TestComponent();
    component.mount(container);
  });

  afterEach(() => {
    component.unmount();
    cleanupTestContainer(container);
  });

  test('should update state with object', async () => {
    component.setState({ count: 10, message: 'Updated' });

    await waitForNextTick();

    expect(component.state.count).toBe(10);
    expect(component.state.message).toBe('Updated');

    const heading = container.querySelector('h1');
    expect(heading.textContent).toBe('Updated');
  });

  test('should update state with function', async () => {
    component.setState(prevState => ({
      count: prevState.count + 5
    }));

    await waitForNextTick();

    expect(component.state.count).toBe(5);
  });

  test('should get current state', () => {
    const currentState = component.getState();

    expect(currentState).toEqual({
      count: 0,
      message: 'Hello World'
    });

    // Should be a copy, not reference
    expect(currentState).not.toBe(component.state);
  });

  test('should reset state to initial values', async () => {
    component.setState({ count: 100, message: 'Changed' });
    await waitForNextTick();

    component.resetState();
    await waitForNextTick();

    expect(component.state.count).toBe(0);
    expect(component.state.message).toBe('Hello World');
  });

  test('should handle reactive state changes', async () => {
    // Direct state mutation should trigger update
    component.state.count = 15;

    await waitForNextTick();

    const paragraph = container.querySelector('p');
    expect(paragraph.textContent).toBe('Count: 15');
  });
});

/**
 * Component Error Handling Tests
 */
describe('Component Error Handling', () => {
  let component;
  let container;

  beforeEach(() => {
    container = createTestContainer();
  });

  afterEach(() => {
    if (component && component._isMounted) {
      component.unmount();
    }
    cleanupTestContainer(container);
  });

  test('should handle render errors', () => {
    component = new ErrorComponent({ shouldError: true });

    // Mock console.error to avoid test output noise
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    component.mount(container);

    expect(component._componentState).toBe(ComponentState.ERROR);
    expect(component.errorInfo).toBeDefined();
    expect(component.errorInfo.error.message).toBe('Test error in render');
    expect(component.errorInfo.phase).toBe('mount');

    consoleSpy.mockRestore();
  });

  test('should handle lifecycle hook errors', () => {
    component = new TestComponent();

    // Override lifecycle hook to throw error
    component.mounted = () => {
      throw new Error('Lifecycle error');
    };

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    component.mount(container);

    expect(component._componentState).toBe(ComponentState.ERROR);

    consoleSpy.mockRestore();
  });
});

/**
 * Component Hierarchy Tests
 */
describe('Component Hierarchy', () => {
  let parentComponent;
  let container;

  beforeEach(() => {
    container = createTestContainer();
    parentComponent = new ParentComponent();
  });

  afterEach(() => {
    if (parentComponent && parentComponent._isMounted) {
      parentComponent.unmount();
    }
    cleanupTestContainer(container);
  });

  test('should manage child components', () => {
    parentComponent.mount(container);

    const childComponent = parentComponent.getChild('test-child');
    expect(childComponent).toBeTruthy();
    expect(childComponent._parent).toBe(parentComponent);
    expect(parentComponent.getChildren().size).toBe(1);
  });

  test('should remove child components', () => {
    parentComponent.mount(container);

    parentComponent.removeChild('test-child');

    expect(parentComponent.getChild('test-child')).toBe(null);
    expect(parentComponent.getChildren().size).toBe(0);
  });

  test('should unmount child components when parent unmounts', () => {
    parentComponent.mount(container);
    const childComponent = parentComponent.getChild('test-child');

    parentComponent.unmount();

    expect(childComponent._isMounted).toBe(false);
  });
});

/**
 * Component Event System Tests
 */
describe('Component Event System', () => {
  let component;
  let container;

  beforeEach(() => {
    container = createTestContainer();
    component = new TestComponent();
    component.mount(container);
  });

  afterEach(() => {
    component.unmount();
    cleanupTestContainer(container);
  });

  test('should add and trigger event handlers', () => {
    const handler = jest.fn();

    component.addEventListener('test-event', handler);
    component.emit('test-event', { data: 'test' });

    expect(handler).toHaveBeenCalledWith({ data: 'test' });
  });

  test('should remove event handlers', () => {
    const handler = jest.fn();

    component.addEventListener('test-event', handler);
    component.removeEventListener('test-event', handler);
    component.emit('test-event', { data: 'test' });

    expect(handler).not.toHaveBeenCalled();
  });

  test('should bubble events to parent', () => {
    const parentComponent = new ParentComponent();
    parentComponent.mount(container);

    const childComponent = parentComponent.getChild('test-child');
    const parentHandler = jest.fn();

    parentComponent.addEventListener('child-event', parentHandler);
    childComponent.emit('child-event', { data: 'from child' });

    expect(parentHandler).toHaveBeenCalledWith({ data: 'from child' });
  });
});

/**
 * Component Registry Tests
 */
describe('ComponentRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new ComponentRegistry();
  });

  afterEach(() => {
    registry.clear();
  });

  test('should register and create components', () => {
    registry.register('TestComponent', TestComponent);

    expect(registry.isRegistered('TestComponent')).toBe(true);
    expect(registry.getRegisteredComponents()).toContain('TestComponent');

    const instance = registry.create('TestComponent', { prop: 'value' });
    expect(instance).toBeInstanceOf(TestComponent);
    expect(instance.props.prop).toBe('value');
  });

  test('should throw error for unregistered component', () => {
    let errorThrown = false;
    try {
      registry.create('UnknownComponent');
    } catch (error) {
      errorThrown = true;
      expect(error.message).toBe('Component UnknownComponent is not registered');
    }
    expect(errorThrown).toBe(true);
  });

  test('should throw error for invalid component class', () => {
    class InvalidComponent {}

    let errorThrown = false;
    try {
      registry.register('InvalidComponent', InvalidComponent);
    } catch (error) {
      errorThrown = true;
      expect(error.message).toBe('Component InvalidComponent must extend TodoLangComponent');
    }
    expect(errorThrown).toBe(true);
  });

  test('should manage component instances', () => {
    registry.register('TestComponent', TestComponent);
    const instance = registry.create('TestComponent');

    expect(registry.getInstance(instance.id)).toBe(instance);
    expect(registry.getActiveInstances()).toContain(instance);

    registry.removeInstance(instance.id);
    expect(registry.getInstance(instance.id)).toBe(null);
  });

  test('should set global props', () => {
    registry.setGlobalProps({ globalProp: 'global' });
    registry.register('TestComponent', TestComponent);

    const instance = registry.create('TestComponent', { localProp: 'local' });

    expect(instance.props.globalProp).toBe('global');
    expect(instance.props.localProp).toBe('local');
  });

  test('should unregister components', () => {
    registry.register('TestComponent', TestComponent);
    registry.unregister('TestComponent');

    expect(registry.isRegistered('TestComponent')).toBe(false);
  });

  test('should clear all registrations and instances', () => {
    registry.register('TestComponent', TestComponent);
    const instance = registry.create('TestComponent');

    registry.clear();

    expect(registry.getRegisteredComponents()).toHaveLength(0);
    expect(registry.getActiveInstances()).toHaveLength(0);
  });
});

/**
 * Global Registry Tests
 */
describe('Global Component Registry', () => {
  afterEach(() => {
    globalRegistry.clear();
  });

  test('should register components globally', () => {
    registerComponent('GlobalTest', TestComponent);

    expect(globalRegistry.isRegistered('GlobalTest')).toBe(true);

    const instance = createComponent('GlobalTest');
    expect(instance).toBeInstanceOf(TestComponent);
  });
});

/**
 * Component Performance Tests
 */
describe('Component Performance', () => {
  let component;
  let container;

  beforeEach(() => {
    container = createTestContainer();
    component = new TestComponent();
    component.mount(container);
  });

  afterEach(() => {
    component.unmount();
    cleanupTestContainer(container);
  });

  test('should track render performance', () => {
    const initialRenderCount = component._renderCount;

    component.forceUpdate();

    expect(component._renderCount).toBe(initialRenderCount + 1);
    expect(component._lastRenderTime).toBeGreaterThan(0);
  });

  test('should provide debug information', () => {
    const debugInfo = component.getDebugInfo();

    expect(debugInfo).toHaveProperty('id');
    expect(debugInfo).toHaveProperty('displayName', 'TestComponent');
    expect(debugInfo).toHaveProperty('state', ComponentState.MOUNTED);
    expect(debugInfo).toHaveProperty('isMounted', true);
    expect(debugInfo).toHaveProperty('renderCount');
    expect(debugInfo).toHaveProperty('lastRenderTime');
  });
});

/**
 * Integration Tests
 */
describe('Component Integration', () => {
  test('should integrate with virtual DOM system', () => {
    const container = createTestContainer();
    const component = new TestComponent();

    component.mount(container);

    // Check that virtual DOM is properly rendered
    const element = container.querySelector('.test-component');
    expect(element).toBeTruthy();
    expect(element.tagName.toLowerCase()).toBe('div');

    // Check that event handlers work
    const button = container.querySelector('button');
    expect(button).toBeTruthy();

    component.unmount();
    cleanupTestContainer(container);
  });

  test('should integrate with state management system', async () => {
    const container = createTestContainer();
    const component = new TestComponent();

    component.mount(container);

    // State changes should trigger re-renders
    component.setState({ count: 42 });
    await waitForNextTick();

    const paragraph = container.querySelector('p');
    expect(paragraph.textContent).toBe('Count: 42');

    component.unmount();
    cleanupTestContainer(container);
  });
});