/**
 * Custom Component Framework
 *
 * This module provides a complete component system with:
 * - Base component class with lifecycle methods
 * - Component rendering pipeline using virtual DOM
 * - State management integration with reactive system
 * - Component registration and instantiation system
 */

import { VirtualDOMRenderer, createElement } from './virtual-dom.js';
import { TodoLangStateManager } from '../state/index.js';

/**
 * Component Lifecycle States
 */
const ComponentState = {
  CREATED: 'created',
  MOUNTING: 'mounting',
  MOUNTED: 'mounted',
  UPDATING: 'updating',
  UNMOUNTING: 'unmounting',
  UNMOUNTED: 'unmounted',
  ERROR: 'error'
};

/**
 * Base Component Class
 * Provides lifecycle methods, state management, and rendering capabilities
 */
class TodoLangComponent {
  constructor(props = {}) {
    // Component identification
    this.id = this._generateId();
    this.displayName = this.constructor.name;

    // Propstate
    this.props = { ...props };
    this.state = {};
    this._initialState = {};

    // Lifecycle state
    this._componentState = ComponentState.CREATED;
    this._isMounted = false;
    this._isUpdating = false;

    // Rendering
    this._renderer = new VirtualDOMRenderer();
    this._container = null;
    this._currentVNode = null;

    // State management
    this._stateManager = null;
    this._reactiveState = null;
    this._stateUnsubscribe = null;

    // Child components
    this._children = new Map();
    this._parent = null;

    // Event handlers
    this._eventHandlers = new Map();

    // Performance tracking
    this._renderCount = 0;
    this._lastRenderTime = 0;

    // Initialize component
    this._initialize();
  }

  /**
   * Initialize the component
   * @private
   */
  _initialize() {
    // Set up initial state if provided
    if (this.getInitialState) {
      this._initialState = this.getInitialState();
      this.state = { ...this._initialState };
    }

    // Set up state management
    this._setupStateManagement();

    // Call created lifecycle hook
    this._callLifecycleHook('created');
  }

  /**
   * Set up reactive state management
   * @private
   */
  _setupStateManagement() {
    if (!this._stateManager) {
      this._stateManager = new TodoLangStateManager();
    }

    // Create reactive state
    this._reactiveState = this._stateManager.createState(this.state, this.id);

    // Subscribe to state changes
    this._stateUnsubscribe = this._stateManager.subscribe((changes) => {
      this._handleStateChange(changes);
    });

    // Replace state with reactive proxy
    this.state = this._reactiveState;
  }

  /**
   * Handle state changes and trigger re-render
   * @private
   */
  _handleStateChange(changes) {
    if (this._isMounted && !this._isUpdating) {
      this._scheduleUpdate();
    }
  }

  /**
   * Schedule a component update
   * @private
   */
  _scheduleUpdate() {
    if (this._updateScheduled) return;

    this._updateScheduled = true;
    Promise.resolve().then(() => {
      this._updateScheduled = false;
      if (this._isMounted) {
        this.update();
      }
    });
  }

  /**
   * Mount the component to a DOM container
   * @param {HTMLElement} container - DOM element to mount to
   */
  mount(container) {
    if (this._isMounted) {
      console.warn(`Component ${this.displayName} is already mounted`);
      return;
    }

    this._componentState = ComponentState.MOUNTING;
    this._container = container;

    try {
      // Call beforeMount lifecycle hook
      this._callLifecycleHook('beforeMount');

      // Perform initial render
      this._performRender();

      // Mark as mounted
      this._isMounted = true;
      this._componentState = ComponentState.MOUNTED;

      // Call mounted lifecycle hook
      this._callLifecycleHook('mounted');

    } catch (error) {
      this._componentState = ComponentState.ERROR;
      this._handleError(error, 'mount');
    }
  }

  /**
   * Unmount the component from its container
   */
  unmount() {
    if (!this._isMounted) {
      console.warn(`Component ${this.displayName} is not mounted`);
      return;
    }

    this._componentState = ComponentState.UNMOUNTING;

    try {
      // Call beforeUnmount lifecycle hook
      this._callLifecycleHook('beforeUnmount');

      // Unmount child components
      this._unmountChildren();

      // Clean up state subscription
      if (this._stateUnsubscribe) {
        this._stateUnsubscribe();
        this._stateUnsubscribe = null;
      }

      // Clean up state manager dependencies
      if (this._stateManager) {
        this._stateManager.clearDependencies(this.id);
      }

      // Clean up renderer
      if (this._renderer && this._container) {
        this._renderer.unmount(this._container);
      }

      // Clean up event handlers
      this._cleanupEventHandlers();

      // Reset state
      this._isMounted = false;
      this._container = null;
      this._currentVNode = null;
      this._componentState = ComponentState.UNMOUNTED;

      // Call unmounted lifecycle hook
      this._callLifecycleHook('unmounted');

    } catch (error) {
      this._componentState = ComponentState.ERROR;
      this._handleError(error, 'unmount');
    }
  }

  /**
   * Update the component (re-render)
   */
  update() {
    if (!this._isMounted || this._isUpdating) {
      return;
    }

    this._componentState = ComponentState.UPDATING;
    this._isUpdating = true;

    try {
      // Call beforeUpdate lifecycle hook
      this._callLifecycleHook('beforeUpdate');

      // Perform render
      this._performRender();

      // Call updated lifecycle hook
      this._callLifecycleHook('updated');

      this._componentState = ComponentState.MOUNTED;

    } catch (error) {
      this._componentState = ComponentState.ERROR;
      this._handleError(error, 'update');
    } finally {
      this._isUpdating = false;
    }
  }

  /**
   * Force a component update
   */
  forceUpdate() {
    if (this._isMounted) {
      this.update();
    }
  }

  /**
   * Set component state (triggers re-render)
   * @param {Object|Function} newState - New state or state updater function
   */
  setState(newState) {
    if (!this._reactiveState) {
      console.warn('Cannot set state: component state not initialized');
      return;
    }

    let stateUpdate;
    if (typeof newState === 'function') {
      stateUpdate = newState(this.state);
    } else {
      stateUpdate = newState;
    }

    // Update reactive state
    Object.assign(this.state, stateUpdate);
  }

  /**
   * Get current component state
   * @returns {Object} Current state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Reset state to initial values
   */
  resetState() {
    this.setState(this._initialState);
  }

  /**
   * Perform the actual rendering
   * @private
   */
  _performRender() {
    if (!this._container) {
      throw new Error('Cannot render: no container specified');
    }

    const startTime = performance.now();

    // Start dependency tracking
    if (this._stateManager) {
      this._stateManager.startTracking(this.id);
    }

    try {
      // Call render method
      const vnode = this.render();

      if (!vnode) {
        throw new Error('Render method must return a virtual node');
      }

      // Render to DOM
      this._renderer.render(vnode, this._container);
      this._currentVNode = vnode;

      // Update performance metrics
      this._renderCount++;
      this._lastRenderTime = performance.now() - startTime;

    } finally {
      // Stop dependency tracking
      if (this._stateManager) {
        this._stateManager.stopTracking();
      }
    }
  }

  /**
   * Render method - must be implemented by subclasses
   * @returns {VNode} Virtual DOM node
   */
  render() {
    throw new Error('Render method must be implemented by subclass');
  }

  /**
   * Get initial state - can be overridden by subclasses
   * @returns {Object} Initial state
   */
  getInitialState() {
    return {};
  }

  /**
   * Lifecycle hook: called after component is created
   */
  created() {}

  /**
   * Lifecycle hook: called before component is mounted
   */
  beforeMount() {}

  /**
   * Lifecycle hook: called after component is mounted
   */
  mounted() {}

  /**
   * Lifecycle hook: called before component is updated
   */
  beforeUpdate() {}

  /**
   * Lifecycle hook: called after component is updated
   */
  updated() {}

  /**
   * Lifecycle hook: called before component is unmounted
   */
  beforeUnmount() {}

  /**
   * Lifecycle hook: called after component is unmounted
   */
  unmounted() {}

  /**
   * Error handler - can be overridden by subclasses
   * @param {Error} error - The error that occurred
   * @param {string} phase - The lifecycle phase where error occurred
   */
  onError(error, phase) {
    console.error(`Error in component ${this.displayName} during ${phase}:`, error);
  }

  /**
   * Add child component
   * @param {string} key - Child component key
   * @param {TodoLangComponent} component - Child component instance
   */
  addChild(key, component) {
    this._children.set(key, component);
    component._parent = this;
  }

  /**
   * Remove child component
   * @param {string} key - Child component key
   */
  removeChild(key) {
    const child = this._children.get(key);
    if (child) {
      child.unmount();
      child._parent = null;
      this._children.delete(key);
    }
  }

  /**
   * Get child component
   * @param {string} key - Child component key
   * @returns {TodoLangComponent|null} Child component or null
   */
  getChild(key) {
    return this._children.get(key) || null;
  }

  /**
   * Get all child components
   * @returns {Map} Map of child components
   */
  getChildren() {
    return new Map(this._children);
  }

  /**
   * Add event handler
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   */
  addEventListener(event, handler) {
    if (!this._eventHandlers.has(event)) {
      this._eventHandlers.set(event, new Set());
    }
    this._eventHandlers.get(event).add(handler);
  }

  /**
   * Remove event handler
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   */
  removeEventListener(event, handler) {
    const handlers = this._eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this._eventHandlers.delete(event);
      }
    }
  }

  /**
   * Emit event to handlers
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  emit(event, data) {
    const handlers = this._eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler.call(this, data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }

    // Bubble to parent if available
    if (this._parent) {
      this._parent.emit(event, data);
    }
  }

  /**
   * Get component debug information
   * @returns {Object} Debug information
   */
  getDebugInfo() {
    return {
      id: this.id,
      displayName: this.displayName,
      state: this._componentState,
      isMounted: this._isMounted,
      isUpdating: this._isUpdating,
      renderCount: this._renderCount,
      lastRenderTime: this._lastRenderTime,
      childCount: this._children.size,
      eventHandlerCount: this._eventHandlers.size,
      hasParent: !!this._parent
    };
  }

  /**
   * Call lifecycle hook safely
   * @private
   */
  _callLifecycleHook(hookName) {
    try {
      if (typeof this[hookName] === 'function') {
        this[hookName]();
      }
    } catch (error) {
      this._handleError(error, hookName);
    }
  }

  /**
   * Handle component errors
   * @private
   */
  _handleError(error, phase) {
    this._componentState = ComponentState.ERROR;

    try {
      this.onError(error, phase);
    } catch (handlerError) {
      console.error('Error in error handler:', handlerError);
    }

    // Bubble error to parent
    if (this._parent) {
      this._parent._handleError(error, `child-${phase}`);
    }
  }

  /**
   * Unmount all child components
   * @private
   */
  _unmountChildren() {
    for (const [key, child] of this._children) {
      try {
        child.unmount();
      } catch (error) {
        console.error(`Error unmounting child ${key}:`, error);
      }
    }
    this._children.clear();
  }

  /**
   * Clean up event handlers
   * @private
   */
  _cleanupEventHandlers() {
    this._eventHandlers.clear();
  }

  /**
   * Generate unique component ID
   * @private
   */
  _generateId() {
    return `component-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Component Registry
 * Manages component registration and instantiation
 */
class ComponentRegistry {
  constructor() {
    this._components = new Map();
    this._instances = new Map();
    this._globalProps = {};
  }

  /**
   * Register a component class
   * @param {string} name - Component name
   * @param {Class} ComponentClass - Component class
   */
  register(name, ComponentClass) {
    if (this._components.has(name)) {
      console.warn(`Component ${name} is already registered. Overwriting.`);
    }

    if (!(ComponentClass.prototype instanceof TodoLangComponent) && ComponentClass !== TodoLangComponent) {
      throw new Error(`Component ${name} must extend TodoLangComponent`);
    }

    this._components.set(name, ComponentClass);
  }

  /**
   * Unregister a component
   * @param {string} name - Component name
   */
  unregister(name) {
    this._components.delete(name);
  }

  /**
   * Check if component is registered
   * @param {string} name - Component name
   * @returns {boolean} True if registered
   */
  isRegistered(name) {
    return this._components.has(name);
  }

  /**
   * Create component instance
   * @param {string} name - Component name
   * @param {Object} props - Component props
   * @returns {TodoLangComponent} Component instance
   */
  create(name, props = {}) {
    const ComponentClass = this._components.get(name);
    if (!ComponentClass) {
      throw new Error(`Component ${name} is not registered`);
    }

    // Merge with global props
    const mergedProps = { ...this._globalProps, ...props };
    const instance = new ComponentClass(mergedProps);

    // Store instance reference
    this._instances.set(instance.id, instance);

    return instance;
  }

  /**
   * Get component instance by ID
   * @param {string} id - Component ID
   * @returns {TodoLangComponent|null} Component instance or null
   */
  getInstance(id) {
    return this._instances.get(id) || null;
  }

  /**
   * Remove component instance
   * @param {string} id - Component ID
   */
  removeInstance(id) {
    const instance = this._instances.get(id);
    if (instance) {
      instance.unmount();
      this._instances.delete(id);
    }
  }

  /**
   * Set global props for all components
   * @param {Object} props - Global props
   */
  setGlobalProps(props) {
    this._globalProps = { ...props };
  }

  /**
   * Get all registered component names
   * @returns {Array} Array of component names
   */
  getRegisteredComponents() {
    return Array.from(this._components.keys());
  }

  /**
   * Get all active component instances
   * @returns {Array} Array of component instances
   */
  getActiveInstances() {
    return Array.from(this._instances.values());
  }

  /**
   * Clear all registrations and instances
   */
  clear() {
    // Unmount all instances
    for (const instance of this._instances.values()) {
      try {
        instance.unmount();
      } catch (error) {
        console.error('Error unmounting instance during clear:', error);
      }
    }

    this._components.clear();
    this._instances.clear();
    this._globalProps = {};
  }

  /**
   * Get registry debug information
   * @returns {Object} Debug information
   */
  getDebugInfo() {
    return {
      registeredComponents: this._components.size,
      activeInstances: this._instances.size,
      globalProps: Object.keys(this._globalProps).length
    };
  }
}

// Create global component registry
const globalRegistry = new ComponentRegistry();

/**
 * Convenience function to register components
 * @param {string} name - Component name
 * @param {Class} ComponentClass - Component class
 */
function registerComponent(name, ComponentClass) {
  globalRegistry.register(name, ComponentClass);
}

/**
 * Convenience function to create components
 * @param {string} name - Component name
 * @param {Object} props - Component props
 * @returns {TodoLangComponent} Component instance
 */
function createComponent(name, props = {}) {
  return globalRegistry.create(name, props);
}

// Export classes and functions
export {
  TodoLangComponent,
  ComponentRegistry,
  ComponentState,
  globalRegistry,
  registerComponent,
  createComponent
};